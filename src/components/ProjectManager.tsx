import React, { useState, useRef } from 'react';
import { ProjectFile } from '../types';
import { Button, Pill } from './UI';
import { fetchGithubRepo } from '../services/github';

interface ProjectManagerProps {
  files: ProjectFile[];
  onSetFiles: (files: ProjectFile[]) => void;
  onSelectFile: (content: string) => void;
  onToast: (msg: string, tone: 'green' | 'yellow' | 'red') => void;
}

export function ProjectManager({ files, onSetFiles, onSelectFile, onToast }: ProjectManagerProps) {
  const [mode, setMode] = useState<'view' | 'import'>('view');

  // GitHub Import State
  const [ghRepo, setGhRepo] = useState('');
  const [ghBranch, setGhBranch] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleGithubImport() {
    if (!ghRepo.trim()) {
      onToast('Please enter a repository (owner/repo)', 'yellow');
      return;
    }

    setLoading(true);
    setProgressMsg('Initializing connection...');

    try {
      const result = await fetchGithubRepo(
        ghRepo,
        ghBranch,
        ghToken,
        (msg) => setProgressMsg(msg)
      );

      onSetFiles(result.files);
      onToast(result.summary, result.truncated ? 'yellow' : 'green');
      setMode('view');
    } catch (e) {
      onToast(String(e), 'red');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  }

  function handleFolderUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles: ProjectFile[] = [];
    let processed = 0;

    // Only process typical source files
    const RELEVANT_EXTS = ['.java', '.xml', '.properties', '.gradle', '.jsp', '.yaml', '.json', '.ts', '.js'];
    const MAX_UPLOAD = 1000;

    // Cast to File[] explicitly to resolve type inference issues with Array.from(FileList)
    const relevantFiles = (Array.from(fileList) as File[])
      .filter(f => RELEVANT_EXTS.some(ext => f.name.toLowerCase().endsWith(ext)))
      .slice(0, MAX_UPLOAD);

    if (relevantFiles.length === 0) {
      onToast('No relevant source files found (.java, .xml, etc).', 'yellow');
      return;
    }

    relevantFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        // relative path logic varies by browser, using webkitRelativePath if available
        const path = (file as any).webkitRelativePath || file.name;
        newFiles.push({ path, content, language: 'java', size: content.length });
        processed++;
        if (processed === relevantFiles.length) {
          onSetFiles(newFiles);
          onToast(`Uploaded ${newFiles.length} files.`, 'green');
          setMode('view');
        }
      };
      reader.readAsText(file);
    });
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">Project Context</div>
        <div className="flex gap-2">
          {files.length > 0 && (
             <Pill tone="blue">{files.length} files loaded</Pill>
          )}
          <Button variant="subtle" onClick={() => setMode(mode === 'view' ? 'import' : 'view')}>
            {mode === 'view' ? '+ Import / Upload' : 'Back to List'}
          </Button>
        </div>
      </div>

      {mode === 'import' ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
            <div className="text-sm font-semibold mb-2">Import from GitHub</div>
            <div className="space-y-3">
              <div className="grid grid-cols-[2fr,1fr] gap-2">
                <input
                  value={ghRepo}
                  onChange={e => setGhRepo(e.target.value)}
                  placeholder="owner/repo (e.g. google/guava)"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/60 transition-colors"
                />
                <input
                  value={ghBranch}
                  onChange={e => setGhBranch(e.target.value)}
                  placeholder="Branch/Tag (opt)"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/60 transition-colors"
                />
              </div>
              <input
                value={ghToken}
                onChange={e => setGhToken(e.target.value)}
                type="password"
                placeholder="Personal Access Token (optional, for private repos)"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/60 transition-colors"
              />
              <Button variant="primary" onClick={handleGithubImport} disabled={loading} className="w-full justify-center">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    {progressMsg || 'Fetching...'}
                  </span>
                ) : 'Fetch Repository'}
              </Button>
              <div className="text-xs text-slate-500">
                Fetches ~1000 relevant source files (Java, XML, Gradle, JSON, etc). Large files skipped.
                <br />
                <strong>Tip:</strong> Add GitHub token for higher rate limits (5000 vs 60 requests/hour).
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-slate-800 flex-1" />
            <span className="text-xs text-slate-500 uppercase font-semibold">OR</span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
            <div className="text-sm font-semibold mb-2">Upload Directory</div>
            <input
              type="file"
              // @ts-ignore - directory attributes are non-standard but supported in modern browsers
              webkitdirectory=""
              directory=""
              multiple
              ref={fileInputRef}
              onChange={handleFolderUpload}
              className="hidden"
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full">
              Select Folder
            </Button>
             <div className="text-xs text-slate-500 mt-2">
                Processed locally in your browser.
              </div>
          </div>
        </div>
      ) : (
        <div>
          {files.length === 0 ? (
            <div className="text-sm text-slate-400 italic p-2 text-center">
              No files loaded. Import a repo or folder to give the AI more context.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1 pr-2 no-scrollbar">
              {files.map((f, i) => (
                <div
                  key={i}
                  onClick={() => onSelectFile(f.content)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer group transition-colors"
                >
                  <span className="text-xs font-mono text-slate-300 truncate" title={f.path}>{f.path}</span>
                  <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">Load</span>
                </div>
              ))}
            </div>
          )}
          {files.length > 0 && (
             <div className="mt-3 flex justify-end">
                <Button variant="danger" onClick={() => onSetFiles([])} className="text-xs px-2 py-1">Clear Project</Button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}