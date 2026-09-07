import type { ReactNode } from 'react';
import { Progress } from '@/components/ui/progress';
import { POLICIES } from '../data/policies';
import type { GameState } from '../engine';

export const num = (value: number, digits = 1) =>
  value.toLocaleString('en-GH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
export const money = (value: number) => `GH₵${num(value, 2)}bn`;
export const signed = (value: number, digits = 1) =>
  `${value > 0 ? '+' : ''}${num(value, digits)}`;
export const policyName = (id: string) =>
  POLICIES.find((p) => p.id === id)?.name ?? id;
export function Panel({
  title,
  children,
  className = '',
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`gh-panel ${className}`}>
      {title ? (
        <div className="gh-panel-head">
          <h2>{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="gh-panel-body">{children}</div>
    </section>
  );
}
export function Badge({
  children,
  kind = 'assumption',
}: {
  children: ReactNode;
  kind?: string;
}) {
  return <span className={`gh-badge gh-badge-${kind}`}>{children}</span>;
}
export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <div className="gh-metric">
      <div className="gh-metric-label">{label}</div>
      <div className="gh-metric-value">{value}</div>
      <div className="gh-metric-footnote">{detail}</div>
    </div>
  );
}
export function DataRow({ name, value }: { name: string; value: ReactNode }) {
  return (
    <div className="gh-data-row">
      <dt>{name}</dt>
      <dd>{value}</dd>
    </div>
  );
}
export function Points({ items, empty }: { items: string[]; empty?: string }) {
  return items.length ? (
    <ul className="og-points">
      {items.map((item, i) => (
        <li key={`${i}-${item}`}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="gh-muted">{empty ?? 'No changes recorded.'}</p>
  );
}
export function Gauge({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="og-gauge">
      <div className="gh-between">
        <span>{label}</span>
        <strong>{num(value)} / 100</strong>
      </div>
      <Progress value={value} aria-label={label} />
      {note ? <small className="gh-muted">{note}</small> : null}
    </div>
  );
}
export function PolicyHistory({ state }: { state: GameState }) {
  return (
    <div className="gh-stack-sm">
      {state.activePolicies.length ? (
        [...state.activePolicies].reverse().map((p) => (
          <article className="og-policy-status" key={p.id}>
            <div className="gh-between">
              <h3>{policyName(p.proposal.policyId)}</h3>
              <Badge
                kind={
                  p.status === 'rejected' || p.status === 'suspended'
                    ? 'error'
                    : p.status === 'completed'
                      ? 'success'
                      : 'pending'
                }
              >
                {p.status}
              </Badge>
            </div>
            <div className="gh-policy-meta">
              <span>{num(p.progress, 0)}% delivered</span>
              <span>{money(p.spent)} spent</span>
              <span>Funding: {p.proposal.funding}</span>
              <span>Scale {p.proposal.scale}×</span>
              <span>Delivery: {p.proposal.implementation ?? 'agency'}</span>
              <span>Safeguards: {p.proposal.safeguard}</span>
            </div>
            <Progress
              value={p.progress}
              aria-label={`${policyName(p.proposal.policyId)} delivery`}
            />
            {p.delayReason ? (
              <p className="og-small">{p.delayReason}</p>
            ) : (
              <p className="og-small gh-muted">
                {p.status === 'approved'
                  ? 'Awaiting next quarter’s funding and implementation.'
                  : 'Evaluation follows actual delivery; recurring costs continue.'}
              </p>
            )}
          </article>
        ))
      ) : (
        <div className="gh-empty">
          <h3>Your policy record starts here</h3>
          <p>
            Build and submit a proposal. Approval begins a delivery process;
            announcing a programme creates no immediate productive gain.
          </p>
        </div>
      )}
    </div>
  );
}
