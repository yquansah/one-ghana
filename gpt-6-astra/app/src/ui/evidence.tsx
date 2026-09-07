'use client';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { EVIDENCE, SOURCES, RESEARCH_CUTOFF } from '../data/evidence';
import type { GameState } from '../engine';
import { Badge, Panel, Points, num } from './shared';

const statusNames = {
  observation: 'Observed',
  projection: 'Projected',
  assumption: 'Model assumption',
  unavailable: 'Unavailable',
};
export function Evidence({ state }: { state: GameState }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const records = useMemo(
    () =>
      EVIDENCE.filter(
        (e) =>
          (status === 'all' || status === e.status) &&
          `${e.indicator} ${e.definition} ${e.referencePeriod} ${e.caveat} ${SOURCES.find((s) => s.id === e.sourceId)?.publisher}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, status],
  );
  return (
    <div className="gh-stack">
      <div className="gh-page-heading">
        <div>
          <div className="gh-kicker">Evidence cutoff · 4 Sep 2026</div>
          <h1>Know what the model knows.</h1>
          <p>
            Observations retain their own reference periods. Your fictional
            inauguration is Q1 2027; carrying historical conditions into that
            year is a modelling choice.
          </p>
        </div>
      </div>
      <div className="gh-alert gh-alert-info">
        This campaign is pinned to dataset{' '}
        <strong>{state.datasetVersion}</strong> and model{' '}
        <strong>{state.modelVersion}</strong>. New evidence belongs in a new
        campaign; saved histories retain their original baseline.
      </div>
      <ModelGuide />
      <Panel title="Frozen campaign assumptions">
        <Points items={state.baseline.assumptions} />
        <p className="gh-source-note">
          Economic effects, political reactions and household distributions are
          simplified hypotheses. Historical fit would not establish that the
          game predicts real policy effects.
        </p>
      </Panel>
      <Panel title="Search the evidence library">
        <div className="gh-stack">
          <div className="og-search-row">
            <div className="gh-form-field">
              <label htmlFor="evidence-search">
                Indicator, publisher or topic
              </label>
              <Input
                id="evidence-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try cocoa, reserves, unemployment…"
                className="gh-input"
              />
            </div>
            <div className="gh-form-field">
              <label htmlFor="evidence-status">Evidence status</label>
              <NativeSelect
                className="og-select"
                id="evidence-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                {Object.entries(statusNames).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <p className="og-small gh-muted">
            {records.length} of {EVIDENCE.length} records · research cutoff{' '}
            {RESEARCH_CUTOFF}
          </p>
          {records.length ? (
            records.map((e) => {
              const source = SOURCES.find((s) => s.id === e.sourceId);
              return (
                <article className="og-evidence-record" key={e.id}>
                  <div className="gh-between">
                    <h3>{e.indicator}</h3>
                    <Badge
                      kind={
                        e.status === 'observation'
                          ? 'observed'
                          : e.status === 'projection'
                            ? 'projected'
                            : e.status
                      }
                    >
                      {statusNames[e.status]}
                    </Badge>
                  </div>
                  <p className="og-evidence-value">
                    {e.value === null
                      ? 'Unavailable'
                      : num(e.value, Number.isInteger(e.value) ? 0 : 2)}{' '}
                    <span>{e.unit}</span>
                  </p>
                  <p className="og-small">
                    <strong>Reference period:</strong> {e.referencePeriod}
                  </p>
                  <p>{e.definition}</p>
                  {e.caveat ? (
                    <p className="og-small gh-muted">{e.caveat}</p>
                  ) : null}
                  <dl className="og-evidence-meta">
                    <div>
                      <dt>Publisher</dt>
                      <dd>{source?.publisher ?? 'Unavailable'}</dd>
                    </div>
                    <div>
                      <dt>Publication date</dt>
                      <dd>{e.publicationDate ?? 'Exact date unavailable'}</dd>
                    </div>
                    <div>
                      <dt>Revision status</dt>
                      <dd>{e.revisionStatus}</dd>
                    </div>
                    <div>
                      <dt>Source location</dt>
                      <dd>{e.locator}</dd>
                    </div>
                  </dl>
                  {source?.publicationDateNote ? (
                    <p className="og-small gh-muted">
                      {source.publicationDateNote}
                    </p>
                  ) : null}
                  {source?.url ? (
                    <a
                      className="gh-link og-small"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.title} ↗
                    </a>
                  ) : (
                    <p className="og-small gh-muted">
                      Local model assumption; no measured source value.
                    </p>
                  )}
                </article>
              );
            })
          ) : (
            <div className="gh-empty">
              <h3>No matching evidence</h3>
              <p>Try another topic or select all statuses.</p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
export function ModelGuide() {
  return (
    <Panel title="A guide to the model">
      <div className="og-guide-grid">
        {[
          [
            'Follow the money',
            'Budget revenue, spending and debt service are quarterly GH₵ billions. GDP is annual output: real GDP holds starting prices fixed, while nominal GDP moves with prices. An annual equivalent is four quarters at the displayed rate, not a budget promise.',
          ],
          [
            'Reserves are not the budget',
            'International reserves are central-bank external assets. They are separate from spendable treasury cash. Export receipts are gross sales, not government revenue; the model does not add exports to value added a second time.',
          ],
          [
            'Implementation comes first',
            'Approval alone changes no production. Finance, staff, procurement, participation and courts govern implementation. Replanting loses harvests before new trees mature; processing depends on beans and electricity.',
          ],
          [
            'Different households, different effects',
            'Regional output, livelihood weights and household groups are synthetic. The displayed families are fictional. Real income and consumption indices start at 100; welfare and institutional scores use separate model scales.',
          ],
          [
            'Uncertainty has limits',
            'Scenario ranges are illustrative lower, central and upper model cases. They are not calibrated prediction intervals. Comparisons hold external shock seed and timing fixed to isolate the model’s response to different choices.',
          ],
          [
            'Presidency and legacy',
            'Quarterly turns lead to fictional elections after four-year terms. Public approval is political support; life satisfaction is a separate model proxy. After office, maintenance, partial reversal and external stress explore 20 years of durability.',
          ],
          [
            'Institutional hypotheses',
            'Why Nations Fail informs hypotheses about market access, contract enforcement, investment and resistance to reform. The coefficients here are assumptions. Inclusion has no direct GDP bonus: outcomes depend on concrete changes to delivery and investment conditions.',
          ],
          [
            'Where the model falls short',
            'The model cannot reproduce severe crises: inflation is capped at 35%, below Ghana’s 54.1% end-2022 observation. Cocoa contracts, farmgate and world prices differ. Farmer income responds to percentage commodity shocks; changing only the starting world-price level changes export valuation, not farmer-income indices. Price transmission is not calibrated.',
          ],
        ].map(([title, text]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p className="og-small">{text}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}
