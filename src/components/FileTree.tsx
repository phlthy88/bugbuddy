// ============================================================
// File Tree Component
// ============================================================

import { useCallback } from 'react';
import { FileTreeNode, FileSelection } from '../types';

interface FileTreeProps {
  nodes: readonly FileTreeNode[];
  selection: FileSelection;
  onSelectionChange: (selection: FileSelection) => void;
}

export function FileTree({ nodes, selection, onSelectionChange }: FileTreeProps) {
  const toggleExpanded = useCallback((path: string) => {
    const newExpanded = selection.expandedPaths.includes(path)
      ? selection.expandedPaths.filter(p => p !== path)
      : [...selection.expandedPaths, path];
    onSelectionChange({
      ...selection,
      expandedPaths: newExpanded
    });
  }, [selection, onSelectionChange]);

  const toggleSelected = useCallback((path: string, _type: 'file' | 'directory') => {
    const newSelected = selection.selectedPaths.includes(path)
      ? selection.selectedPaths.filter(p => p !== path)
      : [...selection.selectedPaths, path];

    onSelectionChange({
      ...selection,
      selectedPaths: newSelected
    });
  }, [selection, onSelectionChange]);

  const selectAll = useCallback(() => {
    const allPaths: string[] = [];
    function collectPaths(nodes: readonly FileTreeNode[]) {
      for (const node of nodes) {
        if (node.type === 'file' && node.isSupported) {
          allPaths.push(node.path);
        } else if (node.type === 'directory' && node.children) {
          collectPaths(node.children);
        }
      }
    }
    collectPaths(nodes);

    console.log('FileTree - selectAll: found', allPaths.length, 'files');
    onSelectionChange({
      ...selection,
      selectedPaths: allPaths
    });
  }, [nodes, selection, onSelectionChange]);

  const selectNone = useCallback(() => {
    console.log('FileTree - selectNone: clearing selection');
    onSelectionChange({
      ...selection,
      selectedPaths: []
    });
  }, [selection, onSelectionChange]);

  const getSelectedCount = useCallback(() => {
    let count = 0;
    function countSelected(nodes: readonly FileTreeNode[]) {
      for (const node of nodes) {
        if (selection.selectedPaths.includes(node.path)) {
          if (node.type === 'file') {
            count++;
          } else if (node.type === 'directory' && node.children) {
            const files = flattenFiles(node.children);
            count += files.length;
          }
        } else if (node.type === 'directory' && node.children) {
          countSelected(node.children);
        }
      }
    }
    countSelected(nodes);
    return count;
  }, [nodes, selection.selectedPaths]);

  return (
    <div className="space-y-4">
      {/* Selection Controls */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
        <div className="text-sm text-slate-300">
          {getSelectedCount()} files selected
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded transition-colors"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-700 text-slate-200 rounded transition-colors"
          >
            Select None
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="max-h-96 overflow-y-auto border border-slate-700 rounded-lg">
        <div className="p-2">
          {nodes.map(node => (
            <FileTreeNodeComponent
              key={node.path}
              node={node}
              level={0}
              selection={selection}
              onToggleExpanded={toggleExpanded}
              onToggleSelected={toggleSelected}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Individual File Tree Node
// ============================================================

interface FileTreeNodeProps {
  node: FileTreeNode;
  level: number;
  selection: FileSelection;
  onToggleExpanded: (path: string) => void;
  onToggleSelected: (path: string, type: 'file' | 'directory') => void;
}

function FileTreeNodeComponent({ node, level, selection, onToggleExpanded, onToggleSelected }: FileTreeNodeProps) {
  const isExpanded = selection.expandedPaths.includes(node.path);
  const isSelected = selection.selectedPaths.includes(node.path);
  const hasChildren = node.type === 'directory' && node.children && node.children.length > 0;

  console.log('FileTreeNode:', node.path, { type: node.type, hasChildren, isExpanded, childrenCount: node.children?.length });

  const handleToggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('FileTree - toggle expanded:', node.path, hasChildren);
    if (hasChildren) {
      onToggleExpanded(node.path);
    }
  }, [hasChildren, node.path, onToggleExpanded]);

  const handleToggleSelected = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelected(node.path, node.type);
  }, [node.path, node.type, onToggleSelected]);

  const getIcon = () => {
    if (node.type === 'directory') {
      return isExpanded ? '📂' : '📁';
    }
    if (node.language === 'javascript' || node.language === 'typescript') {
      return '🟨';
    }
    if (node.language === 'python') {
      return '🐍';
    }
    if (node.language === 'java') {
      return '☕';
    }
    return '📄';
  };

  const getFileSize = () => {
    if (node.size) {
      return node.size < 1024
        ? `${node.size}B`
        : node.size < 1024 * 1024
        ? `${(node.size / 1024).toFixed(1)}KB`
        : `${(node.size / (1024 * 1024)).toFixed(1)}MB`;
    }
    return '';
  };

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 hover:bg-slate-700/50 rounded cursor-pointer ${
          isSelected ? 'bg-sky-900/30' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleToggleSelected}
      >
        {/* Expansion Toggle */}
        <div
          className={`w-4 h-4 flex items-center justify-center mr-1 ${
            hasChildren ? 'cursor-pointer hover:bg-slate-600 rounded' : ''
          }`}
          onClick={handleToggleExpanded}
        >
          {hasChildren && (
            <span className="text-xs text-slate-400">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
        </div>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}} // Handled by onClick
          className="mr-2 w-3 h-3 text-sky-600 bg-slate-700 border-slate-600 rounded focus:ring-sky-500"
        />

        {/* Icon */}
        <span className="mr-2 text-sm">{getIcon()}</span>

        {/* Name */}
        <span className={`text-sm flex-1 ${node.type === 'directory' ? 'font-medium text-slate-200' : 'text-slate-300'}`}>
          {node.name}
        </span>

        {/* Size/Language */}
        {node.type === 'file' && (
          <div className="text-xs text-slate-500 ml-2">
            {getFileSize()}
            {node.language && ` • ${node.language}`}
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map(child => (
            <FileTreeNodeComponent
              key={child.path}
              node={child}
              level={level + 1}
              selection={selection}
              onToggleExpanded={onToggleExpanded}
              onToggleSelected={onToggleSelected}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to flatten files from a directory
function flattenFiles(nodes: readonly FileTreeNode[]): FileTreeNode[] {
  const result: FileTreeNode[] = [];

  function traverse(node: FileTreeNode) {
    result.push(node);
    if (node.type === 'directory' && node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return result.filter(node => node.type === 'file');
}