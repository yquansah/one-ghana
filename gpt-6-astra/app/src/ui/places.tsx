'use client';
/* oxlint-disable nextjs/no-img-element -- This local schematic SVG requires no raster optimization or image service in the static release. */
import { useState } from 'react';
import { REGIONS } from '../data/baseline';
import { SOURCES } from '../data/evidence';
import type { GameState } from '../engine';
import {
  Badge,
  DataRow,
  Gauge,
  Panel,
  PolicyHistory,
  money,
  num,
} from './shared';

export function Ghana({ state }: { state: GameState }) {
  const [selected, setSelected] = useState('western-north');
  const region =
    state.regions.find((r) => r.id === selected) ?? state.regions[0];
  const projection = REGIONS.find((r) => r.id === region.id);
  const households = state.households.filter((h) => h.regionId === region.id);
  return (
    <div className="gh-stack">
      <div className="gh-page-heading">
        <div>
          <div className="gh-kicker">Places, livelihoods, households</div>
          <h1>One country. Different lives.</h1>
          <p>
            National averages can hide the people carrying a policy’s transition
            costs. Explore all 16 regions and their illustrative households.
          </p>
        </div>
      </div>
      <div className="gh-grid gh-grid-brief">
        <Panel title="Ghana’s 16 regions">
          <div className="og-region-layout">
            <div>
              <img
                src="/design/ghana-regions.svg"
                className="og-ghana-map"
                alt="Labelled schematic of Ghana’s 16 administrative regions. Select a region using the adjacent controls."
              />
              <p className="og-small gh-muted">
                Regional schematic · not to scale. Shapes and colour do not
                represent measured outcomes.
              </p>
            </div>
            <div className="og-region-picker" aria-label="Select a region">
              {state.regions.map((r) => (
                <button
                  className="og-region-button"
                  key={r.id}
                  aria-pressed={r.id === region.id}
                  onClick={() => setSelected(r.id)}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title={region.name}>
          <div className="gh-stack-sm">
            <Badge kind="projected">GSS population projection · 2026</Badge>
            <div className="og-region-population">
              {projection
                ? num(projection.projectedPopulation2026, 0)
                : 'Unavailable'}
            </div>
            <p className="og-small gh-muted">
              People projected from the 2021 census; exact source publication
              day unavailable.
            </p>
            <a
              className="gh-link og-small"
              href={SOURCES.find((s) => s.id === 'gss-projections')?.url}
              target="_blank"
              rel="noreferrer"
            >
              GSS projection table 6.1 ↗
            </a>
            <hr className="gh-rule" />
            <Badge>Synthetic regional allocation</Badge>
            <dl className="gh-data-list">
              <DataRow
                name="Allocated annual real output"
                value={money(region.output)}
              />
              <DataRow
                name="Agriculture share"
                value={`${num(region.agricultureShare)}%`}
              />
              <DataRow
                name="Services share"
                value={`${num(region.servicesShare)}%`}
              />
              <DataRow
                name="Income index · start = 100"
                value={num(region.incomeIndex)}
              />
              <DataRow
                name="Model poverty proxy"
                value={`${num(region.poverty)} / 100`}
              />
            </dl>
            <Gauge
              label="Public service access proxy"
              value={region.serviceAccess}
            />
            <p className="og-small gh-muted">
              Regional economic shares, poverty and services are synthetic
              allocations, not regional survey estimates. Exposure depends on
              livelihood, funding and priority beneficiaries; programmes have no
              region-specific spending control.
            </p>
          </div>
        </Panel>
      </div>
      <Panel title={`Household stories · ${region.name}`}>
        <div className="gh-grid gh-grid-two">
          {households.map((h) => (
            <article className="og-household" key={h.id}>
              <Badge kind="info">Illustrative household</Badge>
              <h3>{h.name.split(' · ')[0]}</h3>
              <p className="og-small">{householdStory(h.livelihood)}</p>
              <dl className="gh-data-list">
                <DataRow
                  name="Real income index · start = 100"
                  value={num(h.incomeIndex)}
                />
                <DataRow
                  name="Consumption index · start = 100"
                  value={num(h.consumptionIndex)}
                />
                <DataRow
                  name="Food security proxy"
                  value={`${num(h.foodSecurity)} / 100`}
                />
                <DataRow
                  name="Job security proxy"
                  value={`${num(h.jobSecurity)} / 100`}
                />
                <DataRow
                  name="Synthetic share of national people"
                  value={`${num(h.populationWeight * 100, 2)}%`}
                />
              </dl>
              <p className="gh-source-note">{h.description}</p>
            </article>
          ))}
        </div>
      </Panel>
      <Panel title="Production and trade">
        <div className="gh-grid gh-grid-two">
          <div>
            <h3>Domestic value added</h3>
            <dl className="gh-data-list">
              {Object.entries(state.economy.sectorOutput).map(
                ([sector, value]) => (
                  <DataRow
                    key={sector}
                    name={`${sector[0].toUpperCase()}${sector.slice(1)}`}
                    value={money(value)}
                  />
                ),
              )}
            </dl>
            <p className="og-small gh-muted">
              Annual real output, at starting prices. Regional and sector
              allocations reconcile to the national model total.
            </p>
          </div>
          <div>
            <h3>Selected exports</h3>
            <dl className="gh-data-list">
              {Object.entries(state.economy.exportsUSD).map(
                ([sector, value]) => (
                  <DataRow
                    key={sector}
                    name={sector}
                    value={`US$${num(value, 2)}bn`}
                  />
                ),
              )}
            </dl>
            <p className="og-small gh-muted">
              Annual receipts of three selected commodities. Gross exports
              include imported inputs and are not added to GDP or treasury
              revenue a second time. Complete partner shares are unavailable.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
function householdStory(livelihood: string) {
  return livelihood === 'cocoa'
    ? 'A cocoa-growing family weighs the income lost while trees are replanted against future harvests. World prices, land security and transport shape what reaches the household.'
    : livelihood === 'smallholder'
      ? 'A food-farming family depends on rainfall, storage and market access. Higher food prices can help sales while making purchased essentials harder to afford.'
      : livelihood === 'informal'
        ? 'A trading household relies on local demand and affordable food, power and transport. Taxes, licensing and changes to public services can arrive before wider growth.'
        : 'A household with salaried work depends on purchasing power, reliable services and stable employment. New taxes can fund benefits while reducing disposable income.';
}
export function Institutions({ state }: { state: GameState }) {
  const i = state.institutions;
  return (
    <div className="gh-stack">
      <div className="gh-page-heading">
        <div>
          <div className="gh-kicker">Permissions, capacity, accountability</div>
          <h1>A presidency has limits.</h1>
          <p>
            Institutions change the route from announcement to delivery.
            Support, administrative capability and public approval remain
            separate.
          </p>
        </div>
        <Badge>Institutional scores are model proxies</Badge>
      </div>
      <div className="gh-grid gh-grid-two">
        <Panel title="Parliament">
          <div className="gh-stack-sm">
            <Gauge label="Legislative support" value={i.parliamentSupport} />
            <p>
              Taxes, borrowing and legislation require the appropriate
              parliamentary authority. Scale, financing and opposition shape
              each proposal’s approval probability.
            </p>
            <p className="og-small gh-muted">
              The approval draw is reproducible with your campaign seed.
              Rejection spends no programme budget; revise the proposal and
              consider political constraints.
            </p>
          </div>
        </Panel>
        <Panel title="Administration & procurement">
          <div className="gh-stack-sm">
            <Gauge
              label="Administrative capacity"
              value={i.administrativeCapacity}
            />
            <Gauge
              label="Procurement integrity"
              value={i.procurementIntegrity}
            />
            <p>
              Staffing, programme workload and procurement affect how much
              funded work is delivered. Multiple simultaneous programmes share
              limited capacity.
            </p>
          </div>
        </Panel>
        <Panel title="Courts & public accountability">
          <div className="gh-stack-sm">
            <Gauge label="Judicial capacity" value={i.judicialCapacity} />
            <Gauge label="Public accountability" value={i.accountability} />
            <p>
              Land rights and market reforms depend on accessible enforcement.
              Inadequate safeguards can trigger court holds; vested interests
              can resist reforms.
            </p>
          </div>
        </Panel>
        <Panel title="Bank of Ghana">
          <div className="gh-stack-sm">
            <div className="og-region-population">{num(i.policyRate)}%</div>
            <Badge kind="info">Simulated monetary policy rate · annual</Badge>
            <p>
              The simulated Bank of Ghana responds to inflation and economic
              conditions. The president influences fiscal and structural
              conditions through their institutions.
            </p>
            <p className="og-small gh-muted">
              There is no presidential interest-rate control. The response rule
              is a teaching assumption, not an account of actual MPC decisions.
            </p>
            <a
              href={SOURCES.find((s) => s.id === 'bog-mandate')?.url}
              className="gh-link og-small"
              target="_blank"
              rel="noreferrer"
            >
              Bank of Ghana monetary mandate ↗
            </a>
          </div>
        </Panel>
      </div>
      <Panel title="Political mandate">
        <div className="gh-grid gh-grid-two">
          <div className="gh-stack-sm">
            <Gauge label="Government approval" value={i.governmentApproval} />
            <p>
              Approval affects elections. It is distinct from life satisfaction
              and from legislative support.
            </p>
          </div>
          <div className="gh-inset">
            <h3>Fictional elections</h3>
            <p>
              Elections are held after 16 and 32 quarterly turns. Losing the
              first ends the presidency; a second term is the maximum. Political
              responses and voting are model assumptions.
            </p>
            {state.election ? (
              <p>
                <strong>
                  {state.election.kind === 'succession'
                    ? 'Two-term limit reached. Your presidency has ended.'
                    : state.election.won
                      ? 'Latest election: mandate renewed.'
                      : 'Latest election: presidency ended.'}
                </strong>{' '}
                Vote share: {num(state.election.voteShare)}%.{' '}
                {state.election.reason}
              </p>
            ) : (
              <p className="og-small gh-muted">
                First election due after turn 16. Ghana’s actual political
                timetable is not being simulated.
              </p>
            )}
          </div>
        </div>
      </Panel>
      <Panel title="Programme delivery and bottlenecks">
        <PolicyHistory state={state} />
      </Panel>
    </div>
  );
}
