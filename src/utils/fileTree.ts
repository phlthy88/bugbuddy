// ============================================================
// File Tree Utilities
// ============================================================

import { CodebaseFile, FileTreeNode } from '../types';

// Mutable version for building
interface MutableFileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: MutableFileTreeNode[];
  size?: number;
  language?: string;
  isSupported?: boolean;
}

export function buildFileTree(files: readonly CodebaseFile[]): readonly FileTreeNode[] {
  const root: MutableFileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;

      // Find existing node at current level
      let existingNode = currentLevel.find(node => node.name === part);

      if (!existingNode) {
        if (isLastPart) {
          // Create file node
          existingNode = {
            name: part,
            path: file.path,
            type: 'file',
            size: file.size,
            language: file.language,
            isSupported: true
          };
        } else {
          // Create directory node
          existingNode = {
            name: part,
            path: parts.slice(0, i + 1).join('/'),
            type: 'directory',
            children: []
          };
        }
        currentLevel.push(existingNode);
      }

      // Move to next level if this is a directory
      if (!isLastPart && existingNode!.type === 'directory') {
        currentLevel = existingNode!.children!;
      }
    }
  }

  // Sort the tree recursively
  function sortNodes(nodes: readonly MutableFileTreeNode[]): readonly FileTreeNode[] {
    const sorted = [...nodes].sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return sorted.map((node): FileTreeNode => {
      if (node.type === 'directory' && node.children) {
        return { ...node, children: sortNodes(node.children) };
      }
      return node;
    });
  }

  return sortNodes(root);
}

// Helper function to get selected files from tree
export function getSelectedFiles(
  tree: readonly FileTreeNode[],
  selectedPaths: readonly string[],
  allFiles: readonly CodebaseFile[]
): CodebaseFile[] {
  const selectedFiles: CodebaseFile[] = [];

  function collectFiles(nodes: readonly FileTreeNode[]) {
    for (const node of nodes) {
      if (node.type === 'file' && selectedPaths.includes(node.path)) {
        const file = allFiles.find(f => f.path === node.path);
        if (file) {
          selectedFiles.push(file);
        }
      } else if (node.type === 'directory' && node.children) {
        collectFiles(node.children);
      }
    }
  }

  collectFiles(tree);
  return selectedFiles;
}