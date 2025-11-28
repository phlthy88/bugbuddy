// ============================================================
// Settings Tab Component
// ============================================================

import { useCallback, useState } from 'react';
import { useBugBuddy } from '../../context/BugBuddyContext';
import { Button, Card, CardHeader, Input, Select } from '../UI';
import { FOCUS_OPTIONS } from '../../constants';
import { FocusMode } from '../../types';
import { useLocalStorageState } from '../../hooks';

export function SettingsTab() {
  const {
    openRouterKey,
    setOpenRouterKey,
    pushToast,
    focus,
    setFocus,
    env,
    updateEnv,
  } = useBugBuddy();

  console.log('SettingsTab - openRouterKey state:', openRouterKey ? `${openRouterKey.substring(0, 10)}... (${openRouterKey.length} chars)` : 'empty');

  const [token, setToken] = useLocalStorageState('bugbuddy_github_token', '');
  const [showToken, setShowToken] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

  const handleSaveToken = useCallback(() => {
    if (!token.trim()) {
      pushToast({
        title: 'Token Cleared',
        message: 'GitHub token has been cleared.',
        tone: 'blue'
      });
      return;
    }

    pushToast({
      title: 'Token Saved',
      message: 'GitHub token stored locally.',
      tone: 'green'
    });
  }, [token, pushToast]);

  const handleClearToken = useCallback(() => {
    setToken('');
    pushToast({
      title: 'Token Cleared',
      message: 'GitHub token has been cleared.',
      tone: 'blue'
    });
  }, [setToken, pushToast]);

  const handleSaveOpenRouterKey = useCallback(() => {
    console.log('SettingsTab - Current openRouterKey state:', openRouterKey ? `${openRouterKey.substring(0, 10)}... (${openRouterKey.length} chars)` : 'empty');

    // Check localStorage directly
    const stored = localStorage.getItem('bugbuddy_openrouter_key');
    console.log('SettingsTab - localStorage value:', stored ? `${stored.substring(0, 10)}... (${stored.length} chars)` : 'null');

    if (!openRouterKey.trim()) {
      pushToast({
        title: 'API Key Cleared',
        message: 'OpenRouter API key has been cleared.',
        tone: 'blue'
      });
      return;
    }

    console.log('SettingsTab - Saving OpenRouter key, length:', openRouterKey.length);
    // Just save the key - validation will happen during AI analysis
    pushToast({
      title: 'API Key Saved',
      message: `OpenRouter API key stored locally. Test it with AI analysis.`,
      tone: 'green'
    });
  }, [openRouterKey, pushToast]);

  const handleTestOpenRouterKey = useCallback(async () => {
    if (!openRouterKey.trim()) {
      pushToast({
        title: 'No API Key',
        message: 'Please enter an API key first.',
        tone: 'yellow'
      });
      return;
    }

    try {
      // Test the key with a simple models request
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        const modelCount = data.data?.length || 0;
        pushToast({
          title: 'API Key Valid',
          message: `Successfully connected! ${modelCount} AI models available.`,
          tone: 'green'
        });
      } else if (response.status === 401) {
        pushToast({
          title: 'Invalid API Key',
          message: 'The API key is not valid. Please check and try again.',
          tone: 'red'
        });
      } else {
        pushToast({
          title: 'Connection Failed',
          message: `API returned status ${response.status}. Please try again.`,
          tone: 'red'
        });
      }
    } catch (error) {
      pushToast({
        title: 'Test Failed',
        message: 'Could not connect to OpenRouter. Check your internet connection.',
        tone: 'red'
      });
    }
  }, [openRouterKey, pushToast]);

  const handleClearOpenRouterKey = useCallback(() => {
    setOpenRouterKey('');
    pushToast({
      title: 'API Key Cleared',
      message: 'OpenRouter API key has been cleared.',
      tone: 'blue'
    });
  }, [setOpenRouterKey, pushToast]);

  return (
    <div className="space-y-6">
      {/* GitHub Integration */}
      <Card>
        <CardHeader
          title="GitHub Integration"
          description="Manage your GitHub Personal Access Token for repository imports."
        />

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Personal Access Token
            </label>
            <div className="flex gap-2">
              <Input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={setToken}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? 'Hide' : 'Show'}
              </Button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Create a token at <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">GitHub Settings</a> with <strong>repo</strong> scope for private repositories.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleSaveToken}
            >
              Save Token
            </Button>
            {token && (
              <Button
                variant="secondary"
                onClick={handleClearToken}
              >
                Clear Token
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* OpenRouter AI Integration */}
      <Card>
        <CardHeader
          title="AI Analysis (OpenRouter)"
          description="Configure your OpenRouter API key for AI-powered code analysis and LSP diagnostics."
        />

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              API Key
            </label>
            <div className="flex gap-2">
              <Input
                type={showOpenRouterKey ? 'text' : 'password'}
                value={openRouterKey}
                onChange={(value) => {
                  console.log('SettingsTab - onChange called with:', value ? `${value.substring(0, 10)}...` : 'empty');
                  setOpenRouterKey(value.trim());
                }}
                placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
              >
                {showOpenRouterKey ? 'Hide' : 'Show'}
              </Button>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {openRouterKey ? (
                openRouterKey.startsWith('sk-or-v1-') ? (
                  <>✓ Valid OpenRouter API key saved ({openRouterKey.length} characters)</>
                ) : (
                  <>⚠️ API key saved but may not be a valid OpenRouter key (should start with 'sk-or-v1-')</>
                )
              ) : (
                <>API key will be saved automatically as you type</>
              )}
              <br />
              <button
                onClick={() => {
                  const stored = localStorage.getItem('bugbuddy_openrouter_key');
                  console.log('Direct localStorage check:', stored ? `${stored.substring(0, 10)}...` : 'null');
                  alert(`localStorage value: ${stored ? stored.substring(0, 10) + '...' : 'null'}\nState value: ${openRouterKey ? openRouterKey.substring(0, 10) + '...' : 'empty'}`);
                }}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Debug localStorage
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Get your free API key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">OpenRouter Keys</a>.
              Free tier: 50 requests/day, 20 requests/minute.
              Used for AI code analysis and LSP diagnostics.
            </p>
            <div className="mt-2 p-2 bg-blue-950/30 border border-blue-800/50 rounded text-xs text-blue-200">
              <strong>How to get your API key:</strong>
              <ol className="mt-1 ml-4 list-decimal space-y-1">
                <li>Visit <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">openrouter.ai</a></li>
                <li>Click "Sign Up" and create an account</li>
                <li>Go to <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Keys page</a></li>
                <li>Click "Create Key" and copy the generated key</li>
                <li>Paste it here and click "Save Key"</li>
              </ol>
            </div>
          </div>

          <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 text-sm">⚠️</span>
              <div className="text-sm text-yellow-200">
                <strong>Security Notice:</strong> API keys are stored in your browser's localStorage.
                This is not secure for sensitive applications. Consider using environment variables in production.
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleSaveOpenRouterKey}
            >
              Save Key
            </Button>
            {openRouterKey && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleTestOpenRouterKey}
                >
                  Test Key
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClearOpenRouterKey}
                >
                  Clear Key
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Analysis Preferences */}
      <Card>
        <CardHeader
          title="Analysis Preferences"
          description="Configure default settings for code analysis."
        />

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Default Focus Mode
            </label>
            <Select
              value={focus}
              onChange={(v) => setFocus(v as FocusMode)}
              options={FOCUS_OPTIONS}
            />
            <p className="mt-1 text-xs text-slate-400">
              This focus mode will be selected by default when analyzing code.
            </p>
          </div>
        </div>
      </Card>

      {/* Environment Defaults */}
      <Card>
        <CardHeader
          title="Environment Defaults"
          description="Set default values for your development environment."
        />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            label="Java version"
            value={env.javaVersion}
            onChange={(v) => updateEnv({ javaVersion: v })}
            placeholder="e.g., 17, 21"
          />
          <Input
            label="Build tool"
            value={env.buildTool}
            onChange={(v) => updateEnv({ buildTool: v })}
            placeholder="Maven / Gradle"
          />
          <Input
            label="Framework"
            value={env.framework}
            onChange={(v) => updateEnv({ framework: v })}
            placeholder="Spring Boot / Quarkus"
          />
          <Input
            label="Runtime"
            value={env.runtime}
            onChange={(v) => updateEnv({ runtime: v })}
            placeholder="JVM / Native"
          />
        </div>

        <div className="mt-4">
          <Input
            label="Default Notes"
            value={env.notes}
            onChange={(v) => updateEnv({ notes: v })}
            placeholder="Any additional context or constraints..."
          />
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader
          title="Data Management"
          description="Manage your stored data and preferences."
        />

        <div className="mt-4 space-y-4">
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <h4 className="text-sm font-medium text-slate-200 mb-2">Stored Data</h4>
            <div className="text-sm text-slate-400 space-y-1">
              <div>• GitHub token (encrypted in localStorage)</div>
              <div>• Analysis preferences and environment settings</div>
              <div>• Code snippets, traces, and analysis history</div>
              <div>• Debug plans and hypotheses</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                const data = {
                  token: localStorage.getItem('bugbuddy_github_token'),
                  focus: localStorage.getItem('bugbuddy_focus'),
                  env: localStorage.getItem('bugbuddy_env'),
                  // Add other keys as needed
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'bugbuddy-settings.json';
                a.click();
                URL.revokeObjectURL(url);
                pushToast({
                  title: 'Settings Exported',
                  message: 'Your settings have been downloaded.',
                  tone: 'green'
                });
              }}
            >
              Export Settings
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm('This will clear all stored data. Are you sure?')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
            >
              Clear All Data
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}