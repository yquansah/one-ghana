import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import type { SaaSEnv } from './env';
import { RESEARCH_SOURCES, fetchSource, discoveryLinks, researchDocument, assertResearchBudgetAvailable } from './research';
import { scheduleNotifications, dispatchOutbox } from './notifications';
type Params = {
    kind: 'hourly' | 'daily';
    scheduledAt: string;
};
export class GhanaResearchWorkflow extends WorkflowEntrypoint<SaaSEnv, Params> {
    async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
        const id = event.instanceId;
        await step.do('record-start', () => this.env.DB.prepare("INSERT OR IGNORE INTO research_jobs(id,kind,status,started_at) VALUES (?,?,'running',?)").bind(id, event.payload.kind, event.payload.scheduledAt).run().then(() => true));
        try {
            if (this.env.RESEARCH_ENABLED !== 'true')
                throw new Error('Research is disabled');
            const failures: string[] = [];
            for (const [index, source] of RESEARCH_SOURCES.entries()) {
                try {
                    const links = await step.do(`discover-${index}`, { retries: { limit: 2, delay: '30 seconds', backoff: 'exponential' }, timeout: '1 minute' }, async () => { await assertResearchBudgetAvailable(this.env); return fetchSource(source.url).then(html => discoveryLinks(html, source.url, event.payload.kind === 'daily' ? 8 : 2)); });
                    if (!links.length)
                        throw new Error('No supported article links discovered');
                    for (const [j, url] of links.entries())
                        await step.do(`article-${index}-${j}`, { retries: { limit: 1, delay: '30 seconds' }, timeout: '3 minutes' }, () => researchDocument(this.env, url, source));
                }
                catch (error) {
                    failures.push(`${source.name}: ${error instanceof Error ? error.message : 'Failed'}`);
                    if (error instanceof Error && /budget/i.test(error.message))
                        break;
                }
            }
            if (failures.length)
                throw new Error(failures.join('; '));
            await step.do('record-success', () => this.env.DB.prepare("UPDATE research_jobs SET status='succeeded',finished_at=? WHERE id=?").bind(new Date().toISOString(), id).run().then(() => true));
        }
        catch (error) {
            await step.do('record-failure', () => this.env.DB.prepare("UPDATE research_jobs SET status='failed',finished_at=?,error=? WHERE id=?").bind(new Date().toISOString(), error instanceof Error ? error.message : 'Research failure', id).run().then(() => true));
            throw error;
        }
    }
}
export async function scheduledResearch(controller: ScheduledController, env: SaaSEnv) {
    const date = new Date(controller.scheduledTime), scheduledAt = date.toISOString();
    if (env.RESEARCH_ENABLED === 'true' && (controller.cron === '0 * * * *' || controller.cron === '0 6 * * *'))
        await env.RESEARCH_WORKFLOW.create({ id: `research-${controller.cron === '0 6 * * *' ? 'daily' : 'hourly'}-${scheduledAt.slice(0, 13).replace(/[^0-9]/g, '')}`, params: { kind: controller.cron === '0 6 * * *' ? 'daily' : 'hourly', scheduledAt } });
    await scheduleNotifications(env, date);
    await dispatchOutbox(env);
}
