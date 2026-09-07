'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Scrollable data regions need keyboard focus for horizontal navigation. */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import type { GameState, MetricSnapshot } from '../engine';
import type { GameController } from './use-game';
import { safely } from './use-game';
import { Badge, Gauge, Panel, Points, num, signed } from './shared';

export function Results({ game }: { game: GameController }) {
  const state = game.state!;
  const [selection, setSelection] = useState<{
    atTurn: number;
    reportQuarter: number;
  } | null>(null);
  const reportQuarter =
    selection?.atTurn === state.quarter ? selection.reportQuarter : null;
  const latest = state.reports[state.reports.length - 1];
  const report =
    state.reports.find((r) => r.quarter === reportQuarter) ?? latest;
  const reportHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    reportHeading.current?.focus();
  }, [state.quarter]);
  return (
    <div className="gh-stack">
      <div className="gh-page-heading">
        <div>
          <div className="gh-kicker">Results, explanations, durability</div>
          <h1>What changed. For whom. Why.</h1>
          <p>
            Keep public welfare separate from political approval. Read delivery,
            external conditions and uncertain assumptions together.
          </p>
        </div>
      </div>
      {state.election ? (
        <Panel className="gh-brief">
          <div className="gh-stack-sm">
            <Badge kind={state.election.won ? 'success' : 'pending'}>
              Election · completed turn {state.election.quarter}
            </Badge>
            <h2>
              {state.phase === 'legacy'
                ? 'Your presidency has ended.'
                : 'Your mandate has been renewed.'}
            </h2>
            <p>
              Model vote share:{' '}
              <strong>{num(state.election.voteShare)}%</strong>.{' '}
              {state.election.reason}
            </p>
            <p className="og-small gh-muted">
              This is a fictional election with assumed political responses.
            </p>
          </div>
        </Panel>
      ) : null}
      <Panel title="Welfare scorecard">
        <p className="og-small gh-muted og-bottom">
          Separate model scores, each out of 100. No universal winning score;
          lower inequality is preferable. Government approval is shown
          separately in Institutions.
        </p>
        <div className="og-welfare-grid">
          {(
            [
              [
                'livingStandards',
                'Living standards',
                'Income, consumption and public services',
              ],
              ['jobs', 'Jobs', 'Model employment proxy'],
              ['health', 'Health', 'Service access and wellbeing proxy'],
              ['education', 'Education', 'Learning and skills proxy'],
              [
                'lifeSatisfaction',
                'Life satisfaction',
                'Model proxy · not a survey measure',
              ],
              ['inequality', 'Inequality', 'Higher means more unequal'],
              ['freedoms', 'Freedoms', 'Rights and access proxy'],
              ['environment', 'Environment', 'Sustainability proxy'],
            ] as const
          ).map(([key, label, note]) => (
            <Gauge
              key={key}
              label={label}
              value={state.welfare[key]}
              note={note}
            />
          ))}
        </div>
      </Panel>
      <Trend state={state} />
      <Panel>
        <div className="gh-stack">
          <div className="gh-between">
            <h2 ref={reportHeading} tabIndex={-1}>
              {report ? report.title : 'Your first quarterly report'}
            </h2>
            {state.reports.length ? (
              <div className="gh-form-field">
                <label className="gh-sr-only" htmlFor="report-quarter">
                  Select quarterly report
                </label>
                <NativeSelect
                  id="report-quarter"
                  className="og-select"
                  value={report?.quarter ?? ''}
                  onChange={(e) =>
                    setSelection({
                      atTurn: state.quarter,
                      reportQuarter: Number(e.target.value),
                    })
                  }
                >
                  {[...state.reports].reverse().map((r) => (
                    <option key={r.quarter} value={r.quarter}>
                      Completed turn {r.quarter}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
          </div>
          {report ? (
            <>
              <p>{report.summary}</p>
              <div className="gh-grid gh-grid-two">
                <ReportSection
                  number="01"
                  title="What you attempted"
                  items={report.attempted}
                  empty="No new proposals were considered this quarter."
                />
                <ReportSection
                  number="02"
                  title="What was delivered"
                  items={report.implemented}
                  empty="No policy programme delivered work this quarter."
                />
                <ReportSection
                  number="03"
                  title="What changed and why"
                  items={report.mechanisms}
                />
                <ReportSection
                  number="04"
                  title="External conditions and uncertainty"
                  items={[...report.external, ...report.uncertainties]}
                />
              </div>
              <div className="gh-inset">
                <h3>Fiscal account</h3>
                <p>{report.fiscalExplanation}</p>
              </div>
              <h3>Household effects this quarter</h3>
              <section
                className="gh-table-wrap"
                aria-label="Household changes in report"
                tabIndex={0}
              >
                <table className="gh-table">
                  <thead>
                    <tr>
                      <th>Illustrative household</th>
                      <th>Income change</th>
                      <th>Mechanism</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.householdChanges.map((h) => (
                      <tr key={h.id}>
                        <th scope="row">{h.name}</th>
                        <td>{signed(h.incomeChange)}% this quarter</td>
                        <td>{h.explanation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          ) : (
            <div className="gh-empty">
              <h3>The effects come after the decision.</h3>
              <p>
                Submit a policy or advance an empty quarter to see how
                implementation and external conditions affect households and
                public finances.
              </p>
              <Button
                className="gh-btn gh-btn-primary"
                disabled={!!game.busy}
                onClick={() => safely(game.advance())}
              >
                Advance the first quarter
              </Button>
            </div>
          )}
        </div>
      </Panel>
      {game.comparisons.length ? (
        <Panel title="Campaign comparison">
          <div className="gh-stack-sm">
            <Badge kind="info">
              Same external shocks · seed {game.comparisons[0].sharedShockSeed}
            </Badge>
            <p>
              {game.comparisons[0].quartersSimulated}-quarter alternatives from
              the current campaign. {game.comparisons[0].horizonNote} Changes
              below are relative to continuing current policies under identical
              shocks.
            </p>
            <section
              className="gh-table-wrap"
              aria-label="Comparison outcomes"
              tabIndex={0}
            >
              <table className="gh-table">
                <thead>
                  <tr>
                    <th>Alternative</th>
                    <th>
                      Real GDP
                      <br />
                      GH₵bn
                    </th>
                    <th>
                      Farmer income
                      <br />
                      index points
                    </th>
                    <th>
                      Debt
                      <br />
                      GH₵bn
                    </th>
                    <th>
                      Living standards
                      <br />
                      score points
                    </th>
                    <th>
                      Approval
                      <br />
                      pp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {game.comparisons.map((c, i) => (
                    <tr key={i}>
                      <th scope="row">
                        {c.label}
                        {c.proposal ? (
                          <p className="og-small gh-muted">
                            {c.proposal.scale}× · {c.proposal.funding} ·{' '}
                            {c.proposal.beneficiaries} ·{' '}
                            {c.proposal.implementation ?? 'agency'} ·{' '}
                            {c.proposal.safeguard}
                          </p>
                        ) : null}
                      </th>
                      <td>{signed(c.delta.gdp, 2)}</td>
                      <td>{signed(c.delta.farmerIncome, 2)}</td>
                      <td>{signed(c.delta.debt, 2)}</td>
                      <td>{signed(c.delta.livingStandards, 2)}</td>
                      <td>{signed(c.delta.approval, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <p className="gh-source-note">
              Differences are conditional model scenarios, not estimated causal
              effects in the real economy. Review the comparison proposals’
              risks before submitting a choice.
            </p>
          </div>
        </Panel>
      ) : (
        <Panel title="Compare the road not taken">
          <p>
            Add two to four policy drafts in the policy workspace to compare
            them with the same external conditions.
          </p>
          <Button
            className="gh-btn gh-btn-secondary og-top"
            variant="outline"
            onClick={() => game.setView('policies')}
          >
            Build alternatives →
          </Button>
        </Panel>
      )}
      <Panel title="A 20-year legacy">
        <div className="gh-stack">
          <p>
            {state.phase === 'legacy'
              ? 'Your term is over. Explore what survives when future governments maintain, partly reverse, or stress-test the inherited policies.'
              : 'Explore conditional legacy paths from the current policy state. Complete your presidency to examine the final inheritance.'}
          </p>
          <Button
            className="gh-btn gh-btn-primary og-fit"
            disabled={!!game.busy}
            onClick={() => safely(game.runLegacy())}
          >
            {game.legacy.length
              ? 'Recalculate legacy scenarios'
              : 'Explore 20-year legacy'}
          </Button>
          {game.legacy.length ? (
            <div className="gh-stack">
              {game.legacy.map((scenario) => (
                <article className="og-legacy" key={scenario.id}>
                  <h3>{scenario.name}</h3>
                  <p>{scenario.description}</p>
                  <section
                    className="gh-table-wrap"
                    aria-label={`${scenario.name} annual outcomes`}
                    tabIndex={0}
                  >
                    <table className="gh-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Real GDP · GH₵bn</th>
                          <th>Living standards / 100</th>
                          <th>Environment / 100</th>
                          <th>Inequality / 100</th>
                          <th>Debt / GDP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scenario.years.map((y) => (
                          <tr key={y.year}>
                            <th scope="row">{y.year}</th>
                            <td>{num(y.gdp, 1)}</td>
                            <td>{num(y.livingStandards)}</td>
                            <td>{num(y.environment)}</td>
                            <td>{num(y.inequality)}</td>
                            <td>{num(y.debtToGDP)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                  <Points items={scenario.assumptions} />
                </article>
              ))}
              <p className="gh-alert">
                Legacy scenarios are modelling exercises, not forecasts. Compare
                what persists across maintenance, reversal and external stress;
                gains may not be shared evenly.
              </p>
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
function ReportSection({
  number,
  title,
  items,
  empty,
}: {
  number: string;
  title: string;
  items: string[];
  empty?: string;
}) {
  return (
    <section className="og-report-section">
      <div className="gh-kicker">{number}</div>
      <h3>{title}</h3>
      <Points items={items} empty={empty} />
    </section>
  );
}
const trendOptions = [
  { key: 'gdp', label: 'Annual real GDP', unit: 'GH₵ billion' },
  {
    key: 'farmerIncome',
    label: 'Cocoa farmer income',
    unit: 'Index · start = 100',
  },
  {
    key: 'livingStandards',
    label: 'Living standards',
    unit: 'Model score / 100',
  },
  { key: 'unemployment', label: 'Unemployment', unit: '% of labour force' },
  { key: 'inflation', label: 'Inflation', unit: '% annual rate' },
  { key: 'debtToGDP', label: 'Public debt / GDP', unit: '%' },
  { key: 'environment', label: 'Environment', unit: 'Model score / 100' },
] as const;
function Trend({ state }: { state: GameState }) {
  const [metric, setMetric] =
    useState<(typeof trendOptions)[number]['key']>('farmerIncome');
  const option = trendOptions.find((o) => o.key === metric)!;
  const values = state.history.map((h) => h[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.15, max * 0.01, 0.5);
  const low = min - padding;
  const high = max + padding;
  const points = state.history
    .map(
      (h, i) =>
        `${55 + (i / Math.max(1, values.length - 1)) * 800},${190 - ((h[metric] - low) / (high - low)) * 150}`,
    )
    .join(' ');
  const first = values[0],
    last = values[values.length - 1];
  return (
    <Panel title="A presidency over time">
      <div className="gh-stack-sm">
        <div className="gh-between">
          <div>
            <p className="og-small gh-muted">
              {option.unit} · completed turns 0–{state.quarter}
            </p>
            <p className="og-trend-value">
              {num(last, 2)}{' '}
              <small>{signed(last - first, 2)} since inauguration</small>
            </p>
          </div>
          <div className="gh-form-field">
            <label className="gh-sr-only" htmlFor="trend-metric">
              Trend measure
            </label>
            <NativeSelect
              id="trend-metric"
              className="og-select"
              value={metric}
              onChange={(e) => setMetric(e.target.value as typeof metric)}
            >
              {trendOptions.map((o) => (
                <option value={o.key} key={o.key}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <svg
          className="og-trend"
          viewBox="0 0 900 235"
          aria-label={`${option.label}: ${num(first, 2)} at inauguration, ${num(last, 2)} after ${state.quarter} turns. Data in the table below.`}
        >
          <line x1="55" x2="855" y1="190" y2="190" stroke="#b1bba9" />
          <line
            x1="55"
            x2="855"
            y1="40"
            y2="40"
            stroke="#d8ddcf"
            strokeDasharray="4 5"
          />
          <text x="3" y="45">
            {num(high, 1)}
          </text>
          <text x="3" y="190">
            {num(low, 1)}
          </text>
          <polyline
            fill="none"
            stroke="#173f31"
            strokeWidth="3"
            points={points}
          />
          <circle
            cx={values.length === 1 ? 55 : 855}
            cy={190 - ((last - low) / (high - low)) * 150}
            r="5"
            fill="#173f31"
          />
          <text x="55" y="220">
            Inauguration
          </text>
          <text x="855" y="220" textAnchor="end">
            Turn {state.quarter}
          </text>
        </svg>
        <details className="og-details">
          <summary>View trend data table</summary>
          <section className="gh-table-wrap">
            <table className="gh-table">
              <thead>
                <tr>
                  <th>Completed turn</th>
                  <th>
                    {option.label} · {option.unit}
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.history.map((h: MetricSnapshot) => (
                  <tr key={h.quarter}>
                    <th scope="row">{h.quarter}</th>
                    <td>{num(h[metric], 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </details>
      </div>
    </Panel>
  );
}
