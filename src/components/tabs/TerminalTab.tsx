// ============================================================
// Terminal Tab Component
// ============================================================

import { useBugBuddy } from '../../context/BugBuddyContext';
import { Terminal } from '../Terminal';
import { ProjectManager } from '../ProjectManager';
import { Button, Card, CardHeader } from '../UI';
import { gitAdd, gitCommit, gitPush, gitCreateBranch, gitCreateDiff, createPullRequest } from '../../services/git';
import { ProjectFile } from '../../types';

export function TerminalTab() {
  const { code, setCode, pushToast, projectFiles, setProjectFiles, openRouterKey } = useBugBuddy();

  const handleSetFiles = (files: ProjectFile[]) => {
    setProjectFiles(files);
  };

  const handleSelectFile = (content: string) => {
    setCode(content);
    pushToast({
      title: 'File loaded',
      message: 'File content loaded into editor',
      tone: 'green'
    });
  };

  const handleToast = (msg: string, tone: 'green' | 'yellow' | 'red') => {
    pushToast({
      title: tone === 'green' ? 'Success' : tone === 'yellow' ? 'Warning' : 'Error',
      message: msg,
      tone
    });
  };

  const handleSaveCurrentFile = () => {
    if (!code.trim()) {
      pushToast({
        title: 'No code to save',
        message: 'Editor is empty',
        tone: 'yellow'
      });
      return;
    }

    const fileName = prompt('Enter filename (e.g., Main.java):');
    if (!fileName) return;

    const newFile: ProjectFile = {
      path: fileName,
      content: code,
      language: fileName.endsWith('.java') ? 'java' : 'text',
      size: code.length
    };

    const updatedFiles = [...projectFiles.filter(f => f.path !== fileName), newFile];
    setProjectFiles(updatedFiles);

    pushToast({
      title: 'File saved',
      message: `${fileName} saved to project`,
      tone: 'green'
    });
  };

  const handleGitOperation = async (operation: string) => {
    try {
      switch (operation) {
        case 'push-main':
          await handleGitPush();
          break;
        case 'create-diff':
          await handleCreateDiff();
          break;
        case 'create-branch':
          await handleCreateBranch();
          break;
        case 'create-pr':
          await handleCreatePR();
          break;
        default:
          pushToast({
            title: 'Unknown Operation',
            message: `Git operation '${operation}' not supported`,
            tone: 'yellow'
          });
      }
    } catch (error) {
      console.error('Git operation error:', error);
      pushToast({
        title: 'Git Operation Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        tone: 'red'
      });
    }
  };

  const handleGitPush = async () => {
    console.log('handleGitPush called, projectFiles:', projectFiles.length);
    if (projectFiles.length === 0) {
      throw new Error('No files to push. Load a project first.');
    }

    try {
      // Add all files to staging
      pushToast({
        title: 'Git Push Started',
        message: 'Adding files to staging area...',
        tone: 'blue'
      });

      const addResult = await gitAdd(['.']);
      if (!addResult.success) {
        throw new Error(addResult.message);
      }

      // Commit the changes
      pushToast({
        title: 'Git Push Progress',
        message: `Committing ${projectFiles.length} files...`,
        tone: 'blue'
      });

      const commitResult = await gitCommit(`Update ${projectFiles.length} files`);
      if (!commitResult.success) {
        throw new Error(commitResult.message);
      }

      // Push to remote
      pushToast({
        title: 'Git Push Progress',
        message: 'Pushing to remote repository...',
        tone: 'blue'
      });

      const pushResult = await gitPush('main');
      if (!pushResult.success) {
        throw new Error(pushResult.message);
      }

      pushToast({
        title: 'Push Successful',
        message: pushResult.message,
        tone: 'green'
      });
    } catch (error) {
      throw error; // Re-throw to be handled by the caller
    }
  };

  const handleCreateDiff = async () => {
    try {
      const result = await gitCreateDiff();
      if (result.success) {
        const diffText = result.data || 'No changes to diff.';

        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(diffText);
          pushToast({
            title: 'Diff Created',
            message: 'Diff copied to clipboard',
            tone: 'green'
          });
        } catch (error) {
          // Fallback for browsers that don't support clipboard API
          console.log('Diff output:', diffText);
          pushToast({
            title: 'Diff Created',
            message: 'Diff logged to console (clipboard not available)',
            tone: 'yellow'
          });
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleCreateBranch = async () => {
    const branchName = prompt('Enter branch name:');
    if (!branchName || !branchName.trim()) {
      throw new Error('Branch name is required');
    }

    if (!branchName.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new Error('Branch name can only contain letters, numbers, hyphens, and underscores');
    }

    pushToast({
      title: 'Creating Branch',
      message: `Creating branch '${branchName}'...`,
      tone: 'blue'
    });

    try {
      const result = await gitCreateBranch(branchName);
      if (result.success) {
        pushToast({
          title: 'Branch Created',
          message: result.message,
          tone: 'green'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleCreatePR = async () => {
    if (projectFiles.length === 0) {
      throw new Error('No changes to create PR from. Load a project first.');
    }

    const prTitle = prompt('Enter PR title:');
    if (!prTitle || !prTitle.trim()) {
      throw new Error('PR title is required');
    }

    const prDescription = prompt('Enter PR description (optional):') || 'Changes from BugBuddy development session';

    pushToast({
      title: 'Creating Pull Request',
      message: 'Submitting PR to repository...',
      tone: 'blue'
    });

    try {
      const result = await createPullRequest(prTitle, prDescription, 'main');
      if (result.success) {
        pushToast({
          title: 'PR Created',
          message: `Pull Request created: ${result.data?.url || 'Success'}`,
          tone: 'green'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column - Project Management */}
      <div className="space-y-6">
        <ProjectManager
          files={projectFiles}
          onSetFiles={handleSetFiles}
          onSelectFile={handleSelectFile}
          onToast={handleToast}
        />


      </div>

      {/* Middle Column - Terminal */}
      <div className="space-y-6">
        <Terminal
          code={code}
          setCode={setCode}
          projectFiles={projectFiles}
          openRouterKey={openRouterKey}
        />
      </div>

      {/* Right Column - Git Operations & File Actions */}
      <div className="space-y-6">
        {/* File Actions */}
        <Card>
          <CardHeader
            title="File Actions"
            description="Save and manage your code"
          />
          <div className="mt-4 space-y-3">
            <Button
              variant="primary"
              onClick={handleSaveCurrentFile}
              className="w-full"
            >
              💾 Save Current File
            </Button>
            <div className="text-xs text-slate-500">
              Saves the current editor content to your project files
            </div>
          </div>
        </Card>

        {/* Git Operations */}
        <Card>
          <CardHeader
            title="Git Operations"
            description="Version control actions"
          />
          <div className="mt-4 space-y-3">
            <Button
              variant="secondary"
              onClick={() => handleGitOperation('push-main')}
              className="w-full justify-start"
            >
              🚀 Push to Main
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleGitOperation('create-diff')}
              className="w-full justify-start"
            >
              📊 Create Diff
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleGitOperation('create-branch')}
              className="w-full justify-start"
            >
              🌿 Create Branch
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleGitOperation('create-pr')}
              className="w-full justify-start"
            >
              🔄 Create PR
            </Button>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Live Git operations with realistic feedback
          </div>
        </Card>
      </div>
    </div>
  );
}