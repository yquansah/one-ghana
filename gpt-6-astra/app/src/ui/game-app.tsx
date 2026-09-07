'use client';
import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  Landmark,
  Map,
  Settings2,
  Sprout,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGame, safely } from './use-game';
import { Policies, initialProposal } from './policies';
import { Ghana, Institutions } from './places';
import { Results } from './results';
import { Evidence, ModelGuide } from './evidence';
import { Briefing } from './briefing';
import { CampaignControls } from './campaign-controls';
import { Panel } from './shared';
import type { PolicyProposal } from '../engine';
const navigation = [
  { id: 'briefing', label: 'Briefing', icon: FileText },
  { id: 'ghana', label: 'Ghana', icon: Map },
  { id: 'policies', label: 'Policies', icon: Sprout },
  { id: 'institutions', label: 'Institutions', icon: Landmark },
  { id: 'results', label: 'Results', icon: TrendingUp },
  { id: 'evidence', label: 'Evidence', icon: BookOpen },
] as const;
export default function GameApp() {
  const game = useGame();
  const [draft, setDraft] = useState<PolicyProposal>(initialProposal());
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const state = game.state;
  function choosePolicy(id: string) {
    setDraft(initialProposal(id));
    game.clearPreview();
    game.setView('policies');
  }
  return (
    <div className="gh-app">
      <a href="#main-content" className="og-skip">
        Skip to game
      </a>
      <div className="gh-layout">
        <aside className="gh-sidebar">
          <div className="gh-brand">
            <Star
              className="gh-brand-mark"
              fill="currentColor"
              strokeWidth={0}
            />
            <div>
              <div className="gh-brand-name">ONE GHANA</div>
              <div className="gh-brand-subtitle">The presidency</div>
            </div>
          </div>
          <nav className="gh-nav" aria-label="Game views">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className="gh-nav-item"
                aria-current={game.view === id ? 'page' : undefined}
                onClick={() => game.setView(id)}
              >
                <Icon />
                {label}
              </button>
            ))}
          </nav>
          <div className="gh-sidebar-footer">
            <div className="og-sidebar-term">
              {state?.phase === 'legacy'
                ? 'The legacy years'
                : `Term ${state && state.quarter >= 16 ? 'II' : 'I'}`}
              <span>
                {state
                  ? `${state.quarter} of 32 turns complete`
                  : 'Preparing your briefing'}
              </span>
            </div>
            <p>Your choices reach beyond your term.</p>
            <button className="gh-nav-item" onClick={() => setGuideOpen(true)}>
              <BookOpen />
              How the model works
            </button>
          </div>
        </aside>
        <div className="og-main-shell">
          <header className="gh-topbar">
            <div className="og-topbar-date">
              <span className="og-live-dot" aria-hidden="true" />
              <strong>
                {state ? `Q${state.quarterOfYear} ${state.year}` : 'Q1 2027'}
              </strong>
              <span className="og-topbar-divider" />
              <span>Fictional presidency</span>
            </div>
            <div className="gh-row">
              <span className="og-save" aria-live="polite">
                <Check size={13} />
                {game.saveStatus}
              </span>
              <Button
                variant="outline"
                className="gh-btn gh-btn-secondary"
                onClick={() => setCampaignOpen(true)}
              >
                <Settings2 />
                Campaign
              </Button>
            </div>
          </header>
          <main id="main-content" className="gh-content">
            <div className="og-campaign-name">
              {state?.name ?? 'Your One Ghana campaign'}
            </div>
            {game.error ? (
              <div role="alert" className="gh-alert gh-alert-error og-bottom">
                <strong>Action needs attention.</strong> {game.error}
                <div className="gh-row og-top">
                  <Button
                    variant="outline"
                    className="gh-btn gh-btn-secondary"
                    onClick={() => game.setError('')}
                  >
                    Dismiss
                  </Button>
                  {state ? (
                    <Button
                      variant="outline"
                      className="gh-btn gh-btn-secondary"
                      onClick={() => safely(game.exportGame())}
                    >
                      Export backup
                    </Button>
                  ) : (
                    <Button
                      className="gh-btn gh-btn-secondary"
                      onClick={() => setCampaignOpen(true)}
                    >
                      Recover campaign
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
            {game.notice ? (
              <output className="gh-alert gh-alert-info og-bottom og-output">
                {game.notice}
              </output>
            ) : null}
            <div
              aria-live="polite"
              className={game.busy ? 'og-worker-status' : 'gh-sr-only'}
            >
              {game.busy || 'Simulation ready'}
            </div>
            {!state ? (
              <Panel>
                <div className="gh-stack">
                  <div className="gh-kicker">Welcome to One Ghana</div>
                  <h1>Your presidency starts with a farmer.</h1>
                  <p>
                    {game.error
                      ? 'Recover a saved campaign or explicitly begin a new one using the campaign controls.'
                      : 'Preparing your evidence, public finances and first decision…'}
                  </p>
                  <Button
                    className="gh-btn gh-btn-primary og-fit"
                    onClick={() => setCampaignOpen(true)}
                  >
                    Open campaign controls
                  </Button>
                </div>
              </Panel>
            ) : game.view === 'briefing' ? (
              <Briefing game={game} choosePolicy={choosePolicy} />
            ) : game.view === 'ghana' ? (
              <Ghana state={state} />
            ) : game.view === 'policies' ? (
              <Policies game={game} draft={draft} setDraft={setDraft} />
            ) : game.view === 'institutions' ? (
              <Institutions state={state} />
            ) : game.view === 'results' ? (
              <Results game={game} />
            ) : (
              <Evidence state={state} />
            )}
            <footer className="og-footer">
              <span>
                One Ghana · A presidency and institutions learning game
              </span>
              <span>
                Evidence cutoff: 4 Sep 2026 · English · Browser-local campaigns
              </span>
            </footer>
          </main>
          {state ? (
            <div className="og-turnbar">
              <div>
                <strong>
                  {state.phase === 'legacy'
                    ? 'A presidency ends. Its consequences continue.'
                    : `Q${state.quarterOfYear} ${state.year} · Make your next decision`}
                </strong>
                <span>
                  {state.phase === 'legacy'
                    ? 'Explore how policy and institutions endure over 20 years.'
                    : `${state.activePolicies.filter((p) => p.approvalQuarter === state.quarter).length} / 2 proposals submitted this quarter. Advancing applies delivery and external conditions.`}
                </span>
              </div>
              <Button
                className="gh-btn gh-btn-primary"
                disabled={!!game.busy}
                onClick={() =>
                  safely(
                    state.phase === 'legacy'
                      ? game.runLegacy()
                      : game.advance(),
                  )
                }
              >
                {game.busy
                  ? 'Working…'
                  : state.phase === 'legacy'
                    ? 'Explore legacy'
                    : 'Advance quarter'}
                <ArrowRight />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <CampaignControls
        game={game}
        open={campaignOpen}
        onOpenChange={setCampaignOpen}
      />
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="og-modal og-guide-modal">
          <DialogHeader>
            <DialogTitle>How One Ghana works</DialogTitle>
            <DialogDescription>
              A guide to decisions, evidence and the model’s limits.
            </DialogDescription>
          </DialogHeader>
          <div className="gh-app">
            <ModelGuide />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
