import { ArrowRight, ChevronRight, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GameController } from './use-game';
import {
  Badge,
  DataRow,
  Metric,
  Panel,
  PolicyHistory,
  money,
  num,
} from './shared';
export function Briefing({
  game,
  choosePolicy,
}: {
  game: GameController;
  choosePolicy: (id: string) => void;
}) {
  const state = game.state!;
  const latest = state.reports[state.reports.length - 1];
  const choices = [
    {
      id: 'farmer-pricing',
      no: '01',
      title: 'Support farmgate incomes',
      text: 'A funded supplement can reach farmers sooner. It creates a recurring claim on the budget.',
      note: 'Income now · ongoing fiscal cost',
    },
    {
      id: 'cocoa-rehabilitation',
      no: '02',
      title: 'Restore the cocoa trees',
      text: 'Replanting can rebuild productivity. Families lose harvests while new trees grow.',
      note: 'Temporary losses · delayed harvest',
    },
    {
      id: 'processing-investment',
      no: '03',
      title: 'Build processing capacity',
      text: 'Add value once plants, beans, reliable electricity and viable markets are available.',
      note: 'Capital first · inputs required',
    },
    {
      id: 'open-procurement',
      no: '04',
      title: 'Improve how money is spent',
      text: 'Transparent procurement can reduce leakage. Reform requires capacity and faces resistance.',
      note: 'Institutional change · gradual delivery',
    },
  ];
  return (
    <div className="gh-stack">
      <div className="gh-page-heading">
        <div>
          <div className="gh-kicker">The president’s daily brief</div>
          <h1>
            {state.phase === 'legacy'
              ? 'The country you leave behind.'
              : state.quarter === 0
                ? 'A better harvest. A better life.'
                : 'The work of governing continues.'}
          </h1>
          <p>
            {state.quarter === 0
              ? 'Your first task: improve cocoa farmers’ lives within the public finances you inherit. The choices are connected. Their consequences will take time.'
              : `You have completed ${state.quarter} quarterly turns. Review delivery, household outcomes and institutional constraints before making the next choice.`}
          </p>
        </div>
        <Badge kind={state.tutorialCompleted ? 'success' : 'pending'}>
          {state.tutorialCompleted
            ? 'Cocoa lesson completed'
            : 'Opening chapter · cocoa & livelihoods'}
        </Badge>
      </div>
      <div className="gh-metrics">
        <Metric
          label="Annual real output"
          value={`${num(state.economy.realGDP / 1000, 2)}tn`}
          detail="GH₵ · at starting prices"
        />
        <Metric
          label="Cocoa farmer income"
          value={num(state.economy.cocoaFarmerIncome)}
          detail="Real income index · start = 100"
        />
        <Metric
          label="Treasury balance"
          value={money(state.fiscal.balance)}
          detail="Quarterly revenue less spending"
        />
        <Metric
          label="Government approval"
          value={`${num(state.institutions.governmentApproval, 0)}%`}
          detail="Political support · model proxy"
        />
      </div>
      <div className="gh-grid gh-grid-brief">
        <Panel className="gh-brief">
          <div className="gh-stack">
            <div className="gh-between">
              <div className="gh-kicker">Decision note · 001</div>
              <Leaf size={22} strokeWidth={1.3} />
            </div>
            <h2>A cocoa policy is also a household policy.</h2>
            <p>
              A farmer needs more than a higher world price. Diseased trees,
              insecure land, costly transport and irregular electricity change
              what reaches the family.
            </p>
            <div className="gh-inset">
              <strong>The question in front of you</strong>
              <p>
                How will you protect livelihoods today while making tomorrow’s
                harvest more productive?
              </p>
            </div>
            <div className="og-opening-choices">
              {choices.map((choice) => (
                <button
                  className="og-opening-choice"
                  key={choice.id}
                  onClick={() => choosePolicy(choice.id)}
                >
                  <span className="og-choice-number">{choice.no}</span>
                  <span>
                    <strong>{choice.title}</strong>
                    <span>{choice.text}</span>
                    <small>{choice.note}</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
            <p className="gh-source-note">
              Cocoa production, household allocations and policy effects include
              explicit assumptions. Current crop output is unavailable in the
              verified evidence package.
            </p>
          </div>
        </Panel>
        <div className="gh-stack">
          <Panel title="The fiscal envelope">
            <div className="gh-stack-sm">
              <p className="og-small gh-muted">
                Quarterly flows · GH₵ billions
              </p>
              <dl className="gh-data-list">
                <DataRow name="Revenue" value={money(state.fiscal.revenue)} />
                <DataRow
                  name="Baseline public services"
                  value={money(state.fiscal.baseSpending)}
                />
                <DataRow
                  name="Policy spending"
                  value={money(state.fiscal.policySpending)}
                />
                <DataRow
                  name="Debt service"
                  value={money(state.fiscal.debtService)}
                />
                <DataRow
                  name={
                    state.fiscal.balance < 0
                      ? 'Budget deficit'
                      : 'Budget surplus'
                  }
                  value={money(state.fiscal.balance)}
                />
              </dl>
              <hr className="gh-rule" />
              <dl className="gh-data-list">
                <DataRow
                  name="Treasury cash · stock"
                  value={money(state.fiscal.cash)}
                />
                <DataRow
                  name="Debt / nominal GDP"
                  value={`${num(state.fiscal.debtToGDP)}%`}
                />
                <DataRow
                  name="Annual budget envelope"
                  value={money(state.fiscal.annualBudget)}
                />
                <DataRow
                  name="Spending recorded this year"
                  value={money(state.fiscal.yearSpending)}
                />
              </dl>
              <Badge>Opening fiscal cash is assumed</Badge>
              <p className="og-small gh-muted">
                International reserves of US${num(state.economy.reservesUSD, 2)}
                bn belong to the central-bank account, not this spending
                envelope.
              </p>
            </div>
          </Panel>
          <Panel title="Your cocoa lesson">
            <ol className="og-lesson">
              <li>
                <span>1</span>
                <div>
                  <strong>Inspect the tradeoffs</strong>
                  <p>Configure a policy and preview financing and delivery.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Put institutions to work</strong>
                  <p>Submit a proposal, then advance the quarter.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Follow the household</strong>
                  <p>Read who gained, who paid, and what was delayed.</p>
                </div>
              </li>
            </ol>
            <Button
              variant="link"
              className="og-top"
              onClick={() => game.setView('ghana')}
            >
              Meet the regional households →
            </Button>
          </Panel>
        </div>
      </div>
      {latest ? (
        <Panel title="Your latest quarterly finding">
          <div className="gh-stack-sm">
            <p>{latest.summary}</p>
            <Button
              variant="outline"
              className="gh-btn gh-btn-secondary og-fit"
              onClick={() => game.setView('results')}
            >
              Read the complete report
              <ArrowRight />
            </Button>
          </div>
        </Panel>
      ) : null}
      <Panel title="Decisions and delivery">
        <PolicyHistory state={state} />
      </Panel>
    </div>
  );
}
