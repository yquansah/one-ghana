import type { SaaSEnv } from './env';
import { handleRequest } from './router';
import { scheduledResearch } from './workflow';
import { consumeNotifications } from './notifications';
export { GhanaResearchWorkflow } from './workflow';

export default {
  fetch: handleRequest,
  async scheduled(controller: ScheduledController,env: SaaSEnv): Promise<void> {
    if (controller.cron === '0 6 * * *') {
      const now = Date.now();
      await env.DB.batch([env.DB.prepare('DELETE FROM oauth_states WHERE expires_at < ?').bind(now),env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now)]);
    }
    await scheduledResearch(controller,env);
  },
  async queue(batch: MessageBatch<{outboxId:string}>,env: SaaSEnv): Promise<void> {
    await consumeNotifications(batch,env);
  },
} satisfies ExportedHandler<SaaSEnv, {outboxId:string}>;
