'use client';
import { useRef, useState } from 'react';
import { Download, GitBranch, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GameController } from './use-game';
import { message, safely } from './use-game';
export function CampaignControls({
  game,
  open,
  onOpenChange,
}: {
  game: GameController;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const [name, setName] = useState('My Ghana presidency');
  const [seed, setSeed] = useState('20260904');
  const [branchName, setBranchName] = useState('Alternative presidency');
  const [confirmNew, setConfirmNew] = useState(false);
  const [removeId, setRemoveId] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error('Choose a One Ghana JSON export below 10 MB.');
      await game.importGame(await file.text());
      onOpenChange(false);
    } catch (e) {
      game.setError(message(e));
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="og-modal">
        <DialogHeader>
          <DialogTitle>Campaign desk</DialogTitle>
          <DialogDescription>
            Automatic saves belong to this browser. Export a backup to carry
            your presidency elsewhere.
          </DialogDescription>
        </DialogHeader>
        <div className="gh-app og-campaign-controls">
          <div className="gh-stack">
            {game.error ? (
              <p role="alert" className="gh-alert gh-alert-error">
                {game.error}
              </p>
            ) : null}
            {game.busy ? (
              <output className="og-small">{game.busy}</output>
            ) : null}
            {game.state ? (
              <div className="gh-inset">
                <strong>{game.state.name}</strong>
                <p className="og-small">
                  Q{game.state.quarterOfYear} {game.state.year} · seed{' '}
                  {game.state.seed}
                </p>
                <p className="og-small">
                  {game.state.datasetVersion} · {game.state.modelVersion}
                </p>
              </div>
            ) : null}
            <div className="gh-row">
              <Button
                variant="outline"
                className="gh-btn gh-btn-secondary"
                disabled={!game.state || !!game.busy}
                onClick={() => safely(game.exportGame())}
              >
                <Download />
                Export campaign
              </Button>
              <Button
                variant="outline"
                className="gh-btn gh-btn-secondary"
                disabled={!!game.busy}
                onClick={() => fileInput.current?.click()}
              >
                <Upload />
                Import campaign
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                className="gh-sr-only"
                aria-label="Import One Ghana campaign JSON"
                onChange={(e) => {
                  void importFile(e.target.files?.[0]);
                }}
              />
            </div>
            <p className="og-small gh-muted">
              Import validates the entire file and archives the active campaign
              before replacing it. A rejected file leaves your current game
              intact.
            </p>
            {game.state ? (
              <div className="gh-stack-sm og-control-section">
                <h3>Create a branch</h3>
                <p className="og-small">
                  Preserve this quarter and seed, then explore another path.
                  Your source campaign remains in the archive.
                </p>
                <label htmlFor="branch-name" className="gh-form-label">
                  Branch name
                </label>
                <Input
                  id="branch-name"
                  className="gh-input"
                  maxLength={80}
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                />
                <Button
                  className="gh-btn gh-btn-secondary og-fit"
                  variant="outline"
                  disabled={!!game.busy || !branchName.trim()}
                  onClick={() =>
                    safely(
                      game.branch(branchName).then(() => onOpenChange(false)),
                    )
                  }
                >
                  <GitBranch />
                  Branch from turn {game.state.quarter}
                </Button>
              </div>
            ) : null}
            <div className="gh-stack-sm og-control-section">
              <h3>Campaign archive · {game.archives.length} / 12</h3>
              <p className="og-small gh-muted">
                Sources are preserved before branching, importing and starting
                anew. A full archive stops replacement until you export and
                remove an archived copy.
              </p>
              {game.archives.length ? (
                game.archives.map((s) => (
                  <article
                    className="og-archive-item"
                    key={JSON.stringify([s.id, s.name, s.quarter])}
                  >
                    <strong>{s.name}</strong>
                    <p className="og-small">
                      Completed turn {s.quarter} · seed {s.seed}
                    </p>
                    <div className="gh-row">
                      <Button
                        variant="outline"
                        className="gh-btn gh-btn-secondary"
                        disabled={!!game.busy}
                        onClick={() =>
                          safely(
                            game
                              .restoreArchive(s.id, s.quarter, s.name)
                              .then(() => onOpenChange(false)),
                          )
                        }
                      >
                        Restore
                      </Button>
                      <Button
                        variant="outline"
                        className="gh-btn gh-btn-secondary"
                        disabled={!!game.busy}
                        onClick={() =>
                          safely(game.exportArchive(s.id, s.quarter, s.name))
                        }
                      >
                        Export
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={!!game.busy}
                        onClick={() =>
                          setRemoveId(JSON.stringify([s.id, s.name, s.quarter]))
                        }
                      >
                        Remove…
                      </Button>
                    </div>
                    {removeId === JSON.stringify([s.id, s.name, s.quarter]) ? (
                      <div className="gh-alert og-top">
                        <p>
                          Remove this archived copy? Keep an export if you want
                          to return to this branch.
                        </p>
                        <div className="gh-row og-top">
                          <Button
                            variant="destructive"
                            className="gh-btn"
                            disabled={!!game.busy}
                            onClick={() =>
                              safely(
                                game
                                  .deleteArchive(s.id, s.quarter, s.name)
                                  .then(() => setRemoveId('')),
                              )
                            }
                          >
                            Remove archived copy
                          </Button>
                          <Button
                            variant="outline"
                            className="gh-btn gh-btn-secondary"
                            onClick={() => setRemoveId('')}
                          >
                            Keep copy
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="og-small gh-muted">No archived campaigns yet.</p>
              )}
            </div>
            <div className="gh-stack-sm og-control-section">
              <h3>Begin a new presidency</h3>
              <div className="gh-grid gh-grid-two">
                <div className="gh-form-field">
                  <label htmlFor="campaign-name">Campaign name</label>
                  <Input
                    id="campaign-name"
                    className="gh-input"
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="gh-form-field">
                  <label htmlFor="campaign-seed">External shock seed</label>
                  <Input
                    id="campaign-seed"
                    className="gh-input"
                    type="number"
                    min="0"
                    max="4294967295"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                  />
                </div>
              </div>
              {confirmNew ? (
                <div className="gh-alert">
                  <p>
                    {game.state
                      ? 'Start again at the fictional inauguration? Your current campaign will be archived before its autosave is replaced.'
                      : 'Start at the fictional inauguration? This replaces any unreadable main autosave. Your campaign archive remains available.'}
                  </p>
                  <div className="gh-row og-top">
                    <Button
                      className="gh-btn gh-btn-primary"
                      disabled={!!game.busy}
                      onClick={() =>
                        safely(
                          game
                            .startNew(
                              name.trim() || 'My Ghana presidency',
                              Number(seed),
                            )
                            .then(() => {
                              setConfirmNew(false);
                              onOpenChange(false);
                            }),
                        )
                      }
                    >
                      Start new presidency
                    </Button>
                    <Button
                      variant="outline"
                      className="gh-btn gh-btn-secondary"
                      onClick={() => setConfirmNew(false)}
                    >
                      Keep playing
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="gh-btn gh-btn-secondary og-fit"
                  disabled={
                    !!game.busy ||
                    !seed ||
                    !Number.isInteger(Number(seed)) ||
                    Number(seed) < 0 ||
                    Number(seed) > 4294967295
                  }
                  onClick={() => setConfirmNew(true)}
                >
                  Prepare new campaign
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
