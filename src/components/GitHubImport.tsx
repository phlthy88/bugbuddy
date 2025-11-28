// ============================================================
// GitHub Repository Import Component
// ============================================================

import { useCallback, useState, useEffect } from 'react';
import { GitHubRepo, GitHubBranch } from '../types';
import { githubService } from '../services/github';
import { Button, Card, CardHeader, EmptyState } from './UI';
import { useLocalStorageState } from '../hooks';

interface GitHubImportProps {
  onImport: (analysis: import('../types').CodebaseAnalysis) => void;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
}

export function GitHubImport({ onImport, onError, onLoading }: GitHubImportProps) {
  const [token, setToken] = useLocalStorageState('bugbuddy_github_token', '');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'token' | 'repos' | 'branch' | 'import'>('token');
  const [showConfirm, setShowConfirm] = useState(false);

  // Initialize GitHub service with stored token
  useEffect(() => {
    if (token) {
      githubService.setToken(token);
    }
  }, [token]);

  // Auto-advance from token step if token is stored
  useEffect(() => {
    if (token && step === 'token' && !loading) {
      // Directly set the service token and fetch repos
      githubService.setToken(token);
      (async () => {
        setLoading(true);
        onLoading(true);
        try {
          const userRepos = await githubService.getUserRepos();
          setRepos(userRepos);
          setStep('repos');
        } catch (error) {
          // If token validation fails, clear it
          setToken('');
          githubService.setToken('');
          onError(error instanceof Error ? error.message : 'Failed to fetch repositories');
        } finally {
          setLoading(false);
          onLoading(false);
        }
      })();
    }
  }, [token, step, loading, onError, onLoading, setToken]);

  const handleSetToken = useCallback(async () => {
    if (!token.trim()) return;

    setLoading(true);
    onLoading(true);

    try {
      githubService.setToken(token);
      const userRepos = await githubService.getUserRepos();
      setRepos(userRepos);
      setStep('repos');
    } catch (error) {
      // If token validation fails, clear it
      setToken('');
      githubService.setToken('');
      onError(error instanceof Error ? error.message : 'Failed to fetch repositories');
    } finally {
      setLoading(false);
      onLoading(false);
    }
  }, [token, onError, onLoading, setToken]);

  const clearToken = useCallback(() => {
    setToken('');
    githubService.setToken('');
    setRepos([]);
    setSelectedRepo(null);
    setBranches([]);
    setSelectedBranch('');
    setStep('token');
  }, [setToken]);

  const handleSelectRepo = useCallback(async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setLoading(true);
    onLoading(true);

    try {
      const repoBranches = await githubService.getRepoBranches(repo.owner.login, repo.name);
      setBranches(repoBranches);
      setSelectedBranch(repo.default_branch);
      setStep('branch');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to fetch branches');
    } finally {
      setLoading(false);
      onLoading(false);
    }
  }, [onError, onLoading]);

  const handleImport = useCallback(async () => {
    if (!selectedRepo || !selectedBranch) return;
    setShowConfirm(true);
  }, [selectedRepo, selectedBranch]);

  const confirmImport = useCallback(async () => {
    if (!selectedRepo || !selectedBranch) return;

    setShowConfirm(false);
    setLoading(true);
    onLoading(true);

    try {
      // Import the repository using the GitHub service directly
      const { githubService } = await import('../services/github');
      const analysis = await githubService.analyzeGitHubRepo(
        selectedRepo.owner.login,
        selectedRepo.name,
        selectedBranch
      );

      // Pass the analysis to the parent component
      onImport(analysis);
      setStep('import');
    } catch (error) {
      console.error('GitHub import error:', error);
      onError(error instanceof Error ? error.message : 'Failed to import repository');
    } finally {
      setLoading(false);
      onLoading(false);
    }
  }, [selectedRepo, selectedBranch, onError, onLoading, onImport]);



  if (step === 'token') {
    return (
      <Card>
        <CardHeader
          title="Import from GitHub"
          description="Connect your GitHub account to import repositories for analysis."
        />

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Create a token at <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">GitHub Settings</a> with <strong>repo</strong> scope.
            </p>
            {token && (
              <p className="mt-1 text-xs text-green-400">
                ✓ Token stored locally
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleSetToken}
              disabled={!token.trim() || loading}
              loading={loading}
            >
              {loading ? 'Connecting...' : 'Connect to GitHub'}
            </Button>
            {token && (
              <Button
                variant="secondary"
                onClick={clearToken}
                disabled={loading}
              >
                Clear Token
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (step === 'repos') {
    return (
      <Card>
        <CardHeader
          title="Select Repository"
          description="Choose a repository to import for analysis."
          action={
            <Button variant="secondary" size="sm" onClick={clearToken}>
              Change Token
            </Button>
          }
        />

        <div className="mt-4">
          {repos.length === 0 ? (
            <EmptyState message="No repositories found. Make sure your token has the correct permissions." />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {repos.map(repo => (
                <div
                  key={repo.id}
                  onClick={() => handleSelectRepo(repo)}
                  className="p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {repo.full_name}
                      </div>
                      {repo.description && (
                        <div className="mt-1 text-xs text-slate-400 line-clamp-2">
                          {repo.description}
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        {repo.language && <span>{repo.language}</span>}
                        <span>•</span>
                        <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                        {repo.private && <span className="text-amber-400">Private</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (step === 'branch') {
    return (
      <Card>
        <CardHeader
          title="Select Branch"
          description={`Choose a branch for ${selectedRepo?.full_name}`}
          action={
            <Button variant="secondary" size="sm" onClick={() => setStep('repos')}>
              Back to Repos
            </Button>
          }
        />

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {branches.map(branch => (
                <option key={branch.name} value={branch.name}>
                  {branch.name} {branch.protected && '(protected)'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!selectedBranch || loading}
              loading={loading}
            >
              {loading ? 'Importing...' : 'Import Repository'}
            </Button>
          </div>

          {/* Confirmation Dialog */}
          {showConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-slate-200 mb-2">
                  Confirm Repository Import
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Are you sure you want to import <strong>{selectedRepo?.full_name}</strong> from the <strong>{selectedBranch}</strong> branch?
                  <br /><br />
                  This will analyze the codebase and may take a few moments depending on the repository size.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => setShowConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={confirmImport}
                  >
                    Import Repository
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return null;
}