import React, { useState, useRef, useEffect } from 'react';
import { TerminalLine, ProjectFile } from '../types';
import { uid } from '../utils';
import { simulateJavaExecution, generateRefactoring } from '../services/ai';
import { DiffDialog } from './DiffDialog';
import {
  checkGitStatus,
  checkGitHubCLIStatus,
  initGitRepo,
  gitAdd,
  gitCommit,
  gitPush,
  gitCreateBranch,
  gitAddRemote,
  gitCreateDiff,
  loginToGitHub,
  setGitHubToken,
  GitStatus,
  GitHubStatus
} from '../services/git';


interface TerminalProps {
  code: string;
  setCode: (code: string) => void;
  projectFiles: ProjectFile[];
  openRouterKey?: string;
}

type ShellType = 'bash' | 'zsh' | 'pwsh' | 'cmd';

// Terminal persistence keys
const TERMINAL_STORAGE_KEYS = {
  lines: 'bugbuddy_terminal_lines',
  currentShell: 'bugbuddy_terminal_shell',
  history: 'bugbuddy_terminal_history',
  currentDirectory: 'bugbuddy_terminal_cwd'
};

// Helper functions for persistence
const saveToStorage = (key: string, value: any) => {
  try {
    // For lines, we need to remove actions since functions can't be serialized
    if (key === TERMINAL_STORAGE_KEYS.lines) {
      const serializableLines = value.map((line: TerminalLine) => ({
        ...line,
        action: undefined // Remove actions as they contain functions
      }));
      localStorage.setItem(key, JSON.stringify(serializableLines));
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn('Failed to save terminal state to localStorage:', error);
  }
};

const loadFromStorage = (key: string, defaultValue: any) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn('Failed to load terminal state from localStorage:', error);
    return defaultValue;
  }
};

export function Terminal({ code, setCode, projectFiles, openRouterKey }: TerminalProps) {

  const [lines, setLines] = useState<TerminalLine[]>(() => {
    const savedLines = loadFromStorage(TERMINAL_STORAGE_KEYS.lines, null);
    if (savedLines && savedLines.length > 0) {
      return savedLines;
    }
    // Return default welcome message if no saved lines
    return [
      { id: 'init', type: 'system', content: 'BugBuddy Cloud Terminal v1.0\nType "help" for commands.' }
    ];
  });
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentShell, setCurrentShell] = useState<ShellType>(() =>
    loadFromStorage(TERMINAL_STORAGE_KEYS.currentShell, 'bash')
  );
  const [history, setHistory] = useState<string[]>(() =>
    loadFromStorage(TERMINAL_STORAGE_KEYS.history, [])
  );
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDirectory, setCurrentDirectory] = useState(() =>
    loadFromStorage(TERMINAL_STORAGE_KEYS.currentDirectory, '/project')
  );

  // Diff dialog state
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [pendingRefactor, setPendingRefactor] = useState<{
    oldCode: string;
    newCode: string;
    explanation: string;
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shellOptions = [
    { value: 'bash', label: 'Bash' },
    { value: 'zsh', label: 'Zsh' },
    { value: 'pwsh', label: 'PowerShell' },
    { value: 'cmd', label: 'Command Prompt' }
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  // Handle shell changes
  useEffect(() => {
    addLine('system', `Switched to ${currentShell.toUpperCase()} shell`);
  }, [currentShell]);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    saveToStorage(TERMINAL_STORAGE_KEYS.lines, lines);
  }, [lines]);

  useEffect(() => {
    saveToStorage(TERMINAL_STORAGE_KEYS.currentShell, currentShell);
  }, [currentShell]);

  useEffect(() => {
    saveToStorage(TERMINAL_STORAGE_KEYS.history, history);
  }, [history]);

  useEffect(() => {
    saveToStorage(TERMINAL_STORAGE_KEYS.currentDirectory, currentDirectory);
  }, [currentDirectory]);

  // Diff dialog handlers
  const handleDiffConfirm = () => {
    if (pendingRefactor) {
      setCode(pendingRefactor.newCode);
      addLine('system', '✅ Patch applied successfully.');
      setDiffDialogOpen(false);
      setPendingRefactor(null);
    }
  };

  const handleDiffCancel = () => {
    addLine('system', 'Patch application cancelled.');
    setDiffDialogOpen(false);
    setPendingRefactor(null);
  };



  const focusInput = (e?: React.MouseEvent) => {
    // Don't focus if clicking on form elements or their children
    if (e?.target instanceof HTMLSelectElement ||
        e?.target instanceof HTMLOptionElement ||
        e?.target instanceof HTMLInputElement) {
      return;
    }

    if (!window.getSelection()?.toString()) {
      inputRef.current?.focus();
    }
  };

  function addLine(type: TerminalLine['type'], content: string, action?: TerminalLine['action']) {
    setLines(prev => {
        // Optimization: Keep max 200 lines to prevent DOM bloating
        const newLines = [...prev, { id: uid(), type, content, action }];
        return newLines.slice(-200);
    });
  }

  // Get shell prompt based on current shell
  function getPrompt() {
    const prompts = {
      bash: `${currentDirectory}$ `,
      zsh: `${currentDirectory} % `,
      pwsh: `PS ${currentDirectory}> `,
      cmd: `${currentDirectory}> `
    };
    return prompts[currentShell];
  }

  // Parse file path relative to current directory
  function resolvePath(path: string): string {
    if (path.startsWith('/')) return path;
    if (path.startsWith('./')) return `${currentDirectory}/${path.slice(2)}`;
    if (path.startsWith('../')) {
      const parentDir = currentDirectory.split('/').slice(0, -1).join('/') || '/';
      return `${parentDir}/${path.slice(3)}`;
    }
    return `${currentDirectory}/${path}`;
  }

  // Find file in project files
  function findFile(path: string): ProjectFile | null {
    const resolvedPath = resolvePath(path);
    return projectFiles.find(f => f.path === resolvedPath) || null;
  }

  async function handleCommand(cmdRaw: string) {
    const cmd = cmdRaw.trim();
    if (!cmd) return;

    // Add to history
    setHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1); // Reset index

    addLine('input', `> ${cmd}`);
    setProcessing(true);
    setInput('');

    // Regex to handle arguments in quotes (e.g. echo "hello world")
    const parts = cmd.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const command = parts[0]?.toLowerCase().replace(/"/g, '');
    const args = parts.slice(1).map(arg => arg.replace(/"/g, ''));

    // Add a safeguard timeout for all commands (30 seconds max)
    const commandTimeout = setTimeout(() => {
      addLine('error', `Command '${command}' timed out after 30 seconds`);
      setProcessing(false);
    }, 30000);

    try {
      switch (command) {
        case 'help':
          addLine('system', `Available commands:
   pwd       Show current directory
   ls        List files in current directory
   cd        <dir> Change directory
   cat       <file> Show file content
   find      <pattern> Find files matching pattern
   grep      <pattern> [file] Search for text in files
   wc        <file> Count lines/words in file
   head      <file> [-n N] Show first N lines
   tail      <file> [-n N] Show last N lines
   run       Compile and run Java code
   refactor  AI code analysis and suggestions
   clear     Clear terminal output (Ctrl+L)
   reset     Reset terminal state (clear all history)

   Git commands:
   git-status    Show Git repository status
   git-init      Initialize a new Git repository
   git-add       <files> Add files to staging area
   git-commit    <message> Commit staged changes
   git-push      Push commits to remote repository
   git-branch    <name> Create and switch to new branch
   git-remote    <name> <url> Add remote repository
   git-diff      Show staged changes
   gh-login      Login to GitHub CLI
   gh-token      <token> Set GitHub personal access token
   gh-status     Check GitHub authentication status`);
          break;

        case 'clear':
          setLines([]);
          // Clear persisted lines but keep other state
          try {
            localStorage.removeItem(TERMINAL_STORAGE_KEYS.lines);
          } catch (error) {
            console.warn('Failed to clear terminal lines from localStorage:', error);
          }
          break;

        case 'reset':
          // Reset all terminal state
          setLines([
            { id: 'reset', type: 'system', content: 'BugBuddy Cloud Terminal v1.0\nTerminal state reset.\nType "help" for commands.' }
          ]);
          setCurrentShell('bash');
          setHistory([]);
          setHistoryIndex(-1);
          setCurrentDirectory('/project');

          // Clear all persisted state
          try {
            Object.values(TERMINAL_STORAGE_KEYS).forEach(key => {
              localStorage.removeItem(key);
            });
          } catch (error) {
            console.warn('Failed to clear terminal state from localStorage:', error);
          }
          break;

        case 'pwd':
          addLine('output', currentDirectory);
          break;

        case 'ls':
          const pathArg = args[0] || '.';
          const targetPath = resolvePath(pathArg);

          if (targetPath === '/project' || pathArg === '.') {
            if (projectFiles.length === 0) {
              addLine('output', 'No project files loaded.');
            } else {
              const fileList = projectFiles.map(f => {
                const relativePath = f.path.startsWith('/project/') ? f.path.slice(9) : f.path;
                const isDir = relativePath.includes('/');
                return isDir ? `${relativePath.split('/')[0]}/` : relativePath;
              }).filter((v, i, arr) => arr.indexOf(v) === i); // unique

              addLine('output', fileList.length > 0 ? fileList.join('\n') : 'No files found');
            }
          } else {
            addLine('error', `ls: cannot access '${pathArg}': No such file or directory`);
          }
          break;

        case 'cd':
          const newDir = args[0] || '/project';
          if (newDir === '..') {
            const parentDir = currentDirectory.split('/').slice(0, -1).join('/') || '/';
            setCurrentDirectory(parentDir);
          } else if (newDir.startsWith('/')) {
            setCurrentDirectory(newDir);
          } else {
            setCurrentDirectory(resolvePath(newDir));
          }
          break;

        case 'cat':
          if (args.length === 0) {
            addLine('error', 'Usage: cat <filename>');
          } else {
            const target = findFile(args[0]);
            if (target) {
              addLine('output', target.content);
            } else {
              addLine('error', `cat: ${args[0]}: No such file or directory`);
            }
          }
          break;

        case 'find':
          if (args.length === 0) {
            addLine('error', 'Usage: find <pattern>');
          } else {
            const pattern = args[0].toLowerCase();
            const matches = projectFiles.filter(f =>
              f.path.toLowerCase().includes(pattern) ||
              f.content.toLowerCase().includes(pattern)
            );
            if (matches.length === 0) {
              addLine('output', 'No matches found.');
            } else {
              addLine('output', matches.map(f => f.path).join('\n'));
            }
          }
          break;

        case 'grep':
          if (args.length === 0) {
            addLine('error', 'Usage: grep <pattern> [file]');
          } else {
            const pattern = args[0];
            const fileArg = args[1];

            let filesToSearch = projectFiles;
            if (fileArg) {
              const target = findFile(fileArg);
              filesToSearch = target ? [target] : [];
            }

            const matches: string[] = [];
            filesToSearch.forEach(file => {
              const lines = file.content.split('\n');
              lines.forEach((line, i) => {
                if (line.includes(pattern)) {
                  matches.push(`${file.path}:${i + 1}:${line.trim()}`);
                }
              });
            });

            if (matches.length === 0) {
              addLine('output', 'No matches found.');
            } else {
              addLine('output', matches.join('\n'));
            }
          }
          break;

        case 'wc':
          if (args.length === 0) {
            addLine('error', 'Usage: wc <filename>');
          } else {
            const target = findFile(args[0]);
            if (target) {
              const lines = target.content.split('\n').length;
              const words = target.content.split(/\s+/).filter(w => w.length > 0).length;
              const chars = target.content.length;
              addLine('output', ` ${lines} ${words} ${chars} ${args[0]}`);
            } else {
              addLine('error', `wc: ${args[0]}: No such file or directory`);
            }
          }
          break;

        case 'head':
        case 'tail':
          if (args.length === 0) {
            addLine('error', `Usage: ${command} <filename> [-n N]`);
          } else {
            const fileArg = args[0];
            let linesCount = 10; // default

            if (args[1] === '-n' && args[2]) {
              linesCount = parseInt(args[2]) || 10;
            }

            const target = findFile(fileArg);
            if (target) {
              const fileLines = target.content.split('\n');
              const selectedLines = command === 'head'
                ? fileLines.slice(0, linesCount)
                : fileLines.slice(-linesCount);

              addLine('output', selectedLines.join('\n'));
            } else {
              addLine('error', `${command}: ${fileArg}: No such file or directory`);
            }
          }
          break;

        case 'run':
          if (!code.trim()) {
            addLine('error', 'Editor is empty. Nothing to run.');
            break;
          }
          addLine('system', 'Compiling and running Java code...');
          addLine('system', 'Note: This is a simulation - real compilation would require a backend service.');

          // Add a small delay to show processing feedback
          await new Promise(resolve => setTimeout(resolve, 500));

          const output = await simulateJavaExecution(code);
          addLine('output', output);
          break;

        case 'refactor':
            if (!code.trim()) {
             addLine('error', 'Editor is empty.');
             break;
            }
            addLine('system', 'Analyzing code with AI...');

            // Show API key status
            if (!openRouterKey) {
              addLine('system', 'No API key configured - using basic heuristics');
            } else {
              addLine('system', 'Using AI analysis (this may take a few seconds)...');
            }

            const result = await generateRefactoring(code, openRouterKey);
            addLine('output', `Analysis: ${result.explanation}`);

            // Show diff dialog instead of direct application
            setPendingRefactor({
              oldCode: code,
              newCode: result.newCode,
              explanation: result.explanation
            });
            setDiffDialogOpen(true);
            break;

        case 'git-status':
          addLine('system', 'Checking Git repository status...');
          try {
            const status: GitStatus = await checkGitStatus();
            if (!status.isGitRepo) {
              addLine('output', 'Not a Git repository. Use "git-init" to initialize.');
            } else {
              addLine('output', `Branch: ${status.currentBranch}`);
              addLine('output', `Remote: ${status.hasRemote ? 'Yes' : 'No'}`);
              addLine('output', `Clean: ${status.isClean ? 'Yes' : 'No'}`);
              if (status.ahead > 0) addLine('output', `Ahead: ${status.ahead} commits`);
              if (status.behind > 0) addLine('output', `Behind: ${status.behind} commits`);
              if (status.staged.length > 0) addLine('output', `Staged: ${status.staged.length} files`);
              if (status.modified.length > 0) addLine('output', `Modified: ${status.modified.length} files`);
              if (status.untracked.length > 0) addLine('output', `Untracked: ${status.untracked.length} files`);
            }
          } catch (error) {
            addLine('error', `Error checking Git status: ${error}`);
          }
          break;

        case 'git-init':
          addLine('system', 'Initializing Git repository...');
          try {
            const result = await initGitRepo();
            if (result.success) {
              addLine('output', result.message);
            } else {
              addLine('error', result.message);
            }
          } catch (error) {
            addLine('error', `Error initializing Git repo: ${error}`);
          }
          break;

        case 'git-add':
          if (args.length === 0) {
            addLine('error', 'Usage: git-add <files> (use "." for all files)');
            break;
          }
          addLine('system', `Adding files to staging area...`);
          try {
            const result = await gitAdd(args);
            if (result.success) {
              addLine('output', result.message);
            } else {
              addLine('error', result.message);
            }
          } catch (error) {
            addLine('error', `Error adding files: ${error}`);
          }
          break;

        case 'git-commit':
          if (args.length === 0) {
            addLine('error', 'Usage: git-commit <message>');
            break;
          }
          const commitMessage = args.join(' ');
          addLine('system', `Committing changes...`);
          try {
            const result = await gitCommit(commitMessage);
            if (result.success) {
              addLine('output', result.message);
            } else {
              addLine('error', result.message);
            }
          } catch (error) {
            addLine('error', `Error committing changes: ${error}`);
          }
          break;

        case 'git-push':
          const branchToPush = args[0] || 'main';
          addLine('system', `Pushing to ${branchToPush}...`);
          try {
            const result = await gitPush(branchToPush);
            if (result.success) {
              addLine('output', result.message);
            } else {
              addLine('error', result.message);
            }
          } catch (error) {
            addLine('error', `Error pushing changes: ${error}`);
          }
          break;

        case 'git-branch':
          if (args.length === 0) {
            addLine('error', 'Usage: git-branch <branch-name>');
            break;
          }
          const branchName = args[0];
          addLine('system', `Creating branch '${branchName}'...`);
          try {
            const result = await gitCreateBranch(branchName);
            if (result.success) {
              addLine('output', result.message);
            } else {
              addLine('error', result.message);
            }
          } catch (error) {
            addLine('error', `Error creating branch: ${error}`);
          }
          break;

        case 'git-remote':
          if (args.length < 2) {
            addLine('error', 'Usage: git-remote <name> <url>');
            break;
          }
          const [remoteName, remoteUrl] = args;
          addLine('system', `Adding remote '${remoteName}'...`);
          try {
            const result = await gitAddRemote(remoteName, remoteUrl);
            if (result.success) {
              addLine('output', result.message);
            } else {
              addLine('error', result.message);
            }
          } catch (error) {
            addLine('error', `Error adding remote: ${error}`);
          }
          break;

        case 'git-diff':
          addLine('system', 'Generating diff...');
          try {
            const result = await gitCreateDiff();
            if (result.success) {
              addLine('output', result.data || 'No staged changes.');
            } else {
              addLine('error', result.message);
            }
          } catch (error) {
            addLine('error', `Error generating diff: ${error}`);
          }
          break;

        case 'gh-status':
          addLine('system', 'Checking GitHub authentication...');
          try {
            const status: GitHubStatus = await checkGitHubCLIStatus();
            if (status.isLoggedIn) {
              addLine('output', `✅ Logged in as ${status.username || 'unknown user'}`);
              addLine('output', `Method: ${status.method}`);
            } else {
              addLine('output', '❌ Not logged in to GitHub');
              addLine('output', 'Use "gh-login" or "gh-token <token>" to authenticate');
            }
          } catch (error) {
            addLine('error', `Error checking GitHub status: ${error}`);
          }
          break;

        case 'gh-login':
          addLine('system', 'Logging in to GitHub CLI...');
          try {
            const result = await loginToGitHub();
            if (result.success) {
              addLine('output', result.message);
            } else {
              addLine('error', result.message);
            }
          } catch (error) {
            addLine('error', `Error logging in: ${error}`);
          }
          break;

        case 'gh-token':
          if (args.length === 0) {
            addLine('error', 'Usage: gh-token <personal-access-token>');
            break;
          }
          const token = args[0];
          addLine('system', 'Setting GitHub token...');
          try {
            const result = await setGitHubToken(token);
            if (result.success) {
              addLine('output', result.message);
            } else {
              addLine('error', result.message);
            }
          } catch (error) {
            addLine('error', `Error setting token: ${error}`);
          }
          break;

        default:
          addLine('error', `${currentShell}: ${command}: command not found`);
      }
    } catch (e) {
      addLine('error', `Error: ${e}`);
    } finally {
      clearTimeout(commandTimeout);
      setProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (processing) return;

    if (e.key === 'Enter') {
        handleCommand(input);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (history.length > 0) {
            const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
            setHistoryIndex(newIndex);
            setInput(history[newIndex]);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex !== -1) {
            const newIndex = Math.min(history.length - 1, historyIndex + 1);
            if (historyIndex === history.length - 1) {
                setHistoryIndex(-1);
                setInput('');
            } else {
                setHistoryIndex(newIndex);
                setInput(history[newIndex]);
            }
        }
    } else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        setLines([]);
    }
  };

  return (
    <div
      className="flex flex-col h-[600px] w-full bg-[#0d1117] rounded-xl border border-slate-800 overflow-visible font-mono text-sm shadow-2xl"
      onClick={focusInput}
    >
      {/* Shell Selector Header */}
      <div
        className="p-3 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Shell:</span>
          <select
            value={currentShell}
            onChange={(e) => {
              const newShell = e.target.value as ShellType;
              setCurrentShell(newShell);
            }}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-sky-500"
          >
            {shellOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-500">
          {projectFiles.length} files loaded
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
        {lines.map(line => (
          <div key={line.id} className="break-words whitespace-pre-wrap group">
             {line.type === 'input' && (
                <div className="flex text-slate-400">
                    <span className="mr-2 text-emerald-500">{getPrompt()}</span>
                    <span>{line.content.replace('> ', '')}</span>
                </div>
             )}
             {line.type === 'output' && <span className="text-slate-300">{line.content}</span>}
             {line.type === 'error' && <span className="text-rose-400 font-semibold">{line.content}</span>}
             {line.type === 'system' && <span className="text-sky-400 italic opacity-80">{line.content}</span>}

             {line.action && (
               <div className="mt-2 ml-4 pl-4 border-l-2 border-emerald-500/30">
                 <button
                   onClick={(e) => { e.stopPropagation(); line.action!.onClick(); }}
                   className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-xs transition-all flex items-center gap-2"
                 >
                   <span>⚡</span> {line.action.label}
                 </button>
               </div>
             )}
          </div>
        ))}
        {processing && (
             <div className="flex items-center gap-2 text-slate-500 mt-2">
                <span className="animate-spin">⟳</span>
                <span className="text-xs">Processing...</span>
             </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 bg-slate-900/50 border-t border-slate-800 flex items-center gap-2">
        <span className="text-emerald-500 font-bold select-none">{processing ? '⌛' : getPrompt()}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={processing}
          className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-700"
          placeholder={processing ? "Wait for process to finish..." : "Enter command..."}
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      {/* Diff Dialog */}
      <DiffDialog
        isOpen={diffDialogOpen}
        onClose={handleDiffCancel}
        onConfirm={handleDiffConfirm}
        oldCode={pendingRefactor?.oldCode || ''}
        newCode={pendingRefactor?.newCode || ''}
        title="Apply AI Refactoring Changes"
      />
    </div>
  );
}