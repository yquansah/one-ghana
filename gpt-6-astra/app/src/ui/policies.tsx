'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Scrollable data regions need keyboard focus for horizontal navigation. */

import { useState } from 'react';
import { ArrowRight, FlaskConical, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { POLICIES, POLICY_FAMILIES } from '../data/policies';
import { EVIDENCE, SOURCES } from '../data/evidence';
import type { PolicyProposal } from '../engine';
import type { GameController } from './use-game';
import { safely } from './use-game';
import {
  Badge,
  DataRow,
  Panel,
  Points,
  PolicyHistory,
  money,
  num,
  signed,
} from './shared';

export const initialProposal = (
  policyId = 'cocoa-rehabilitation',
): PolicyProposal => ({
  policyId,
  scale: 1,
  funding: 'reallocation',
  beneficiaries: 'rural',
  safeguard: 'community',
  implementation: 'agency',
});
export function Policies({
  game,
  draft,
  setDraft,
}: {
  game: GameController;
  draft: PolicyProposal;
  setDraft: (value: PolicyProposal) => void;
}) {
  const [family, setFamily] = useState(
    POLICIES.find((p) => p.id === draft.policyId)?.family ?? 'agriculture',
  );
  const [basket, setBasket] = useState<PolicyProposal[]>([]);
  const policy = POLICIES.find((p) => p.id === draft.policyId) ?? POLICIES[0];
  const preview =
    game.preview &&
    JSON.stringify(game.preview.proposal) === JSON.stringify(draft)
      ? game.preview
      : null;
  function update(patch: Partial<PolicyProposal>) {
    setDraft({ ...draft, ...patch });
    game.clearPreview();
  }
  function choose(id: string) {
    update({ policyId: id });
  }
  const sources = policy.evidenceIds
    .map(
      (id) =>
        SOURCES.find((s) => s.id === id) ??
        SOURCES.find(
          (s) => s.id === EVIDENCE.find((e) => e.id === id)?.sourceId,
        ),
    )
    .filter((s): s is (typeof SOURCES)[number] => Boolean(s));
  return (
    <div className="gh-stack">
      <div className="gh-page-heading">
        <div>
          <div className="gh-kicker">The policy workspace</div>
          <h1>Make the decision. Fund the work.</h1>
          <p>
            Choose who benefits, who pays, and how delivery is held accountable.
            Up to two proposals per quarter; six programmes can be under
            implementation.
          </p>
        </div>
        <Badge kind="info">24 configurable policies</Badge>
      </div>
      <div className="og-policy-layout">
        <aside className="gh-stack-sm">
          <label className="gh-form-label" htmlFor="policy-family">
            Policy family
          </label>
          <NativeSelect
            id="policy-family"
            className="og-select"
            value={family}
            onChange={(e) => setFamily(e.target.value as typeof family)}
          >
            {POLICY_FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </NativeSelect>
          <div className="og-catalogue">
            {POLICIES.filter((p) => p.family === family).map((p) => (
              <button
                key={p.id}
                className="gh-choice"
                aria-label={`Choose ${p.name}`}
                aria-pressed={p.id === draft.policyId}
                onClick={() => choose(p.id)}
              >
                <span>
                  <span className="gh-choice-title">{p.name}</span>
                  <span className="gh-choice-description">{p.summary}</span>
                  <span className="og-catalogue-time">
                    {p.implementationQuarters} quarters · base delivery time
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="gh-source-note">
            Costs, delivery times and effects are model assumptions. Legal
            mechanisms and context link to the evidence library.
          </div>
        </aside>
        <div className="gh-stack">
          <Panel className="og-proposal">
            <div className="gh-stack">
              <div>
                <div className="gh-kicker">Draft proposal</div>
                <h2>{policy.name}</h2>
                <p className="og-lead-small">{policy.summary}</p>
              </div>
              <div className="gh-inset">
                <strong>How it works</strong>
                <p>{policy.mechanism}</p>
              </div>
              <div className="gh-grid gh-grid-two">
                <div className="gh-form-field">
                  <label htmlFor="policy-scale">Programme scale</label>
                  <Input
                    id="policy-scale"
                    type="number"
                    className="gh-input"
                    value={draft.scale}
                    min={0.25}
                    max={2}
                    step={0.25}
                    onChange={(e) => update({ scale: Number(e.target.value) })}
                  />
                  <span className="gh-field-hint">
                    0.25× to 2× the base programme. Higher scale costs more and
                    strains capacity.
                  </span>
                </div>
                <div className="gh-form-field">
                  <label htmlFor="policy-funding">Funding source</label>
                  <NativeSelect
                    id="policy-funding"
                    className="og-select"
                    value={draft.funding}
                    onChange={(e) =>
                      update({
                        funding: e.target.value as PolicyProposal['funding'],
                      })
                    }
                  >
                    <option value="reallocation">
                      Reallocate existing services
                    </option>
                    <option value="tax">Fund with a tax surcharge</option>
                    <option value="borrowing">Borrow through the budget</option>
                  </NativeSelect>
                  <span className="gh-field-hint">
                    Each route has household and fiscal costs.
                  </span>
                </div>
                <div className="gh-form-field">
                  <label htmlFor="policy-beneficiaries">
                    Priority beneficiaries
                  </label>
                  <NativeSelect
                    id="policy-beneficiaries"
                    className="og-select"
                    value={draft.beneficiaries}
                    onChange={(e) =>
                      update({
                        beneficiaries: e.target
                          .value as PolicyProposal['beneficiaries'],
                      })
                    }
                  >
                    <option value="national">National coverage</option>
                    <option value="rural">Rural households</option>
                    <option value="vulnerable">Vulnerable households</option>
                  </NativeSelect>
                </div>
                <div className="gh-form-field">
                  <label htmlFor="policy-delivery">Delivery arrangement</label>
                  <NativeSelect
                    id="policy-delivery"
                    className="og-select"
                    value={draft.implementation ?? 'agency'}
                    onChange={(e) =>
                      update({
                        implementation: e.target
                          .value as PolicyProposal['implementation'],
                      })
                    }
                  >
                    <option value="agency">Lead agency delivery</option>
                    <option value="district">District coordination</option>
                    <option value="partnership">
                      Contracted specialist delivery
                    </option>
                  </NativeSelect>
                  <span className="gh-field-hint">
                    District coordination adds 8% cost and initial delay, with
                    rural participation gains. Specialists add 15% cost and
                    depend on procurement integrity.
                  </span>
                </div>
                <div className="gh-form-field">
                  <label htmlFor="policy-safeguard">
                    Implementation safeguards
                  </label>
                  <NativeSelect
                    id="policy-safeguard"
                    className="og-select"
                    value={draft.safeguard}
                    onChange={(e) =>
                      update({
                        safeguard: e.target
                          .value as PolicyProposal['safeguard'],
                      })
                    }
                  >
                    <option value="standard">Standard administration</option>
                    <option value="transparent">
                      Transparent procurement & audits
                    </option>
                    <option value="community">
                      Community participation & oversight
                    </option>
                  </NativeSelect>
                  <span className="gh-field-hint">
                    Additional oversight has delivery costs and affects support.
                  </span>
                </div>
              </div>
              <dl className="gh-data-list">
                <DataRow name="Legal route" value={policy.legalRoute} />
                <DataRow
                  name="Base one-time setup allocation"
                  value={money(policy.setupCost)}
                />
                <DataRow
                  name="Base recurring cost / quarter"
                  value={money(policy.recurringCost)}
                />
                <DataRow
                  name="Required administrative capacity"
                  value={`${num(policy.capacityRequired, 0)} / 100`}
                />
                <DataRow
                  name="Your administrative capacity"
                  value={`${num(game.state!.institutions.administrativeCapacity)} / 100`}
                />
              </dl>
              <div className="gh-grid gh-grid-two">
                <div>
                  <h3>Intended benefits</h3>
                  <Points items={policy.benefits} />
                </div>
                <div>
                  <h3>Tradeoffs and opposition</h3>
                  <Points items={policy.tradeoffs} />
                </div>
              </div>
              <div className="gh-row">
                <Button
                  className="gh-btn gh-btn-primary"
                  disabled={!!game.busy || game.state!.phase !== 'presidency'}
                  onClick={() => safely(game.previewPolicy(draft))}
                >
                  <FlaskConical />
                  Preview effects
                </Button>
                <Button
                  variant="outline"
                  className="gh-btn gh-btn-secondary"
                  disabled={
                    basket.length >= 4 ||
                    basket.some(
                      (p) => JSON.stringify(p) === JSON.stringify(draft),
                    )
                  }
                  onClick={() => setBasket([...basket, { ...draft }])}
                >
                  <Plus />
                  Add to comparison
                </Button>
              </div>
              {game.state!.phase !== 'presidency' ? (
                <p className="gh-alert">
                  Your presidency has ended. Review your legacy or begin a new
                  campaign to submit policies.
                </p>
              ) : null}
            </div>
          </Panel>
          {preview ? (
            <Panel title="Before you submit">
              <div className="gh-stack">
                {!preview.valid ? (
                  <div className="gh-alert gh-alert-error" role="alert">
                    <strong>Revise this proposal</strong>
                    <Points items={preview.errors} />
                  </div>
                ) : (
                  <p className="gh-alert gh-alert-info">
                    Valid for submission. Approval is uncertain and
                    implementation follows funding.
                  </p>
                )}
                <dl className="gh-data-list">
                  <DataRow
                    name="Estimated funded cost / quarter"
                    value={money(preview.quarterlyCost)}
                  />
                  <DataRow
                    name="Annual equivalent at this rate"
                    value={money(preview.annualCost)}
                  />
                  <DataRow
                    name="Model approval probability"
                    value={`${num(preview.approvalProbability, 0)}%`}
                  />
                  <DataRow
                    name="Estimated implementation time"
                    value={`${preview.implementationQuarters} quarters`}
                  />
                  <DataRow
                    name="Model fiscal headroom"
                    value={money(preview.fiscalHeadroom)}
                  />
                </dl>
                <p>{preview.fundingExplanation}</p>
                <h3>Model scenario range</h3>
                <p className="og-small gh-muted">
                  {preview.rangeLabel} Deltas are relative to continuing current
                  policies.
                </p>
                <section
                  className="gh-table-wrap"
                  aria-label="Policy scenario values"
                  tabIndex={0}
                >
                  <table className="gh-table">
                    <thead>
                      <tr>
                        <th>
                          Up to first-year change
                          <br />
                          Stops at next election
                        </th>
                        <th>Lower</th>
                        <th>Central</th>
                        <th>Upper</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ['Farmer income · index points', 'farmerIncome'],
                          ['Annual real GDP · GH₵bn', 'gdp'],
                          ['Government approval · pp', 'approval'],
                          ['Debt stock · GH₵bn', 'debt'],
                        ] as const
                      ).map(([label, key]) => (
                        <tr key={key}>
                          <th scope="row">{label}</th>
                          {(['low', 'central', 'high'] as const).map(
                            (range) => (
                              <td key={range}>
                                {signed(preview.scenarioRange[range][key], 2)}
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
                <Points items={preview.mechanisms} />
                <ol className="gh-stage-list">
                  {['Approval', 'Funding', 'Implementation', 'Evaluation'].map(
                    (s, i) => (
                      <li
                        className="gh-stage"
                        key={s}
                        aria-current={i === 0 ? 'step' : undefined}
                      >
                        {i + 1}. {s}
                      </li>
                    ),
                  )}
                </ol>
                <Button
                  className="gh-btn gh-btn-primary og-fit"
                  disabled={!!game.busy || !preview.valid}
                  onClick={() => safely(game.submit(draft))}
                >
                  Submit proposal
                  <ArrowRight />
                </Button>
              </div>
            </Panel>
          ) : null}
          <Panel title="Compare choices">
            <div className="gh-stack-sm">
              <p>
                Build two to four alternatives, then compare up to eight
                quarters with the same external shocks. The live campaign stays
                at the current quarter.
              </p>
              {basket.length ? (
                basket.map((p, i) => (
                  <div className="og-comparison-item" key={i}>
                    <div>
                      <strong>
                        {POLICIES.find((item) => item.id === p.policyId)?.name}
                      </strong>
                      <p className="og-small">
                        {p.scale}× · {p.funding} · {p.beneficiaries} ·{' '}
                        {p.implementation ?? 'agency'} · {p.safeguard}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove comparison ${i + 1}`}
                      onClick={() =>
                        setBasket(basket.filter((_, index) => index !== i))
                      }
                    >
                      <X />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="gh-muted og-small">
                  Add a draft above, edit your next alternative, and add it too.
                </p>
              )}
              <Button
                className="gh-btn gh-btn-secondary og-fit"
                variant="outline"
                disabled={
                  basket.length < 2 ||
                  !!game.busy ||
                  game.state!.phase !== 'presidency'
                }
                onClick={() => safely(game.compare(basket))}
              >
                Compare {basket.length} alternatives
              </Button>
            </div>
          </Panel>
          <Panel title="Evidence and assumptions">
            <div className="gh-stack-sm">
              <Points items={policy.assumptions} />
              {sources.length ? (
                sources.map((s, i) =>
                  s.url ? (
                    <a
                      className="gh-link og-small"
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      key={`${s.id}-${i}`}
                    >
                      {s.publisher} — {s.title} ↗
                    </a>
                  ) : null,
                )
              ) : (
                <p className="og-small gh-muted">
                  No policy-specific evaluated effect estimate is available. The
                  mechanism is a documented modelling hypothesis.
                </p>
              )}
              <Button
                variant="link"
                className="og-fit"
                onClick={() => game.setView('evidence')}
              >
                Open full evidence library →
              </Button>
            </div>
          </Panel>
        </div>
      </div>
      <Panel title="Policy record">
        <PolicyHistory state={game.state!} />
      </Panel>
    </div>
  );
}
