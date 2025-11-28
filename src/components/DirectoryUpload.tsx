// ============================================================
// Directory Upload Component
// ============================================================

import { useCallback, useState } from 'react';
import { Button, Card, CardHeader } from './UI';

interface DirectoryUploadProps {
  onUpload: (files: FileList) => void;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
}

export function DirectoryUpload({ onUpload, onError, onLoading }: DirectoryUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleFiles = useCallback((files: FileList) => {
    // Validate that we have files
    if (files.length === 0) {
      onError('No files selected');
      return;
    }

    // Check for reasonable file count
    if (files.length > 1000) {
      onError('Too many files selected. Please select up to 1000 files.');
      return;
    }

    // Check total size (limit to 100MB)
    let totalSize = 0;
    for (let i = 0; i < files.length; i++) {
      totalSize += files[i].size;
    }

    if (totalSize > 100 * 1024 * 1024) {
      onError('Total file size exceeds 100MB limit. Please select smaller files.');
      return;
    }

    setSelectedFiles(files);
  }, [onError]);

  const handleUpload = useCallback(() => {
    if (!selectedFiles) return;
    setShowConfirm(true);
  }, [selectedFiles]);

  const confirmUpload = useCallback(() => {
    if (!selectedFiles) return;

    setShowConfirm(false);
    onLoading(true);
    try {
      onUpload(selectedFiles);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      onLoading(false);
    }
  }, [selectedFiles, onUpload, onError, onLoading]);

  const clearSelection = useCallback(() => {
    setSelectedFiles(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileSummary = (files: FileList): { count: number; totalSize: number; types: Record<string, number> } => {
    const types: Record<string, number> = {};
    let totalSize = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      totalSize += file.size;

      const ext = file.name.split('.').pop()?.toLowerCase() || 'no-ext';
      types[ext] = (types[ext] || 0) + 1;
    }

    return { count: files.length, totalSize, types };
  };

  return (
    <Card>
      <CardHeader
        title="Upload Directory"
        description="Select an entire directory containing your codebase files."
      />

      <div className="mt-4">
        {!selectedFiles ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-sky-400 bg-sky-500/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="space-y-4">
              <div className="text-4xl">📁</div>
              <div>
                <div className="text-lg font-medium text-slate-200">
                  Select a directory
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Click to browse and select an entire directory
                </div>
              </div>

              <input
                type="file"
                multiple
                {...({ webkitdirectory: '' } as any)}
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".js,.jsx,.ts,.tsx,.java,.py,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.clj,.hs,.ml,.fs,.vb,.pl,.lua,.r,.sh,.bash,.zsh,.fish,.ps1,.sql,.xml,.json,.yaml,.yml,.toml,.ini,.cfg,.conf"
              />

              <div className="text-xs text-slate-500">
                Supports code files up to 100MB total • Max 1000 files
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
              <div className="text-sm font-medium text-slate-200 mb-2">
                Selected Files
              </div>

              {(() => {
                const summary = getFileSummary(selectedFiles);
                return (
                  <div className="space-y-2 text-sm text-slate-300">
                    <div>Total files: {summary.count}</div>
                    <div>Total size: {formatFileSize(summary.totalSize)}</div>
                    <div>File types: {Object.entries(summary.types).map(([ext, count]) => `${ext}(${count})`).join(', ')}</div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-2">
              <Button variant="primary" onClick={handleUpload}>
                Analyze Files
              </Button>
              <Button variant="secondary" onClick={clearSelection}>
                Clear Selection
              </Button>
            </div>

            {/* Confirmation Dialog */}
            {showConfirm && selectedFiles && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">
                    Confirm Directory Analysis
                  </h3>
                  <div className="text-sm text-slate-400 mb-4">
                    <p className="mb-2">
                      Are you sure you want to analyze this directory?
                    </p>
                    <div className="bg-slate-800 rounded p-3 text-xs">
                      <div>Files: {getFileSummary(selectedFiles).count}</div>
                      <div>Size: {formatFileSize(getFileSummary(selectedFiles).totalSize)}</div>
                    </div>
                    <p className="mt-2">
                      This will process all supported code files and may take a few moments.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => setShowConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={confirmUpload}
                    >
                      Analyze Directory
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}