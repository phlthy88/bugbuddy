// ============================================================
// GitHub API Service - Tree-based Import with Limits
// ============================================================

import type { GitHubRepo, GitHubBranch, GitHubFile, ProjectFile } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

// Limits to prevent exploding the browser/token limits
const MAX_FILES = 1000;
const MAX_TOTAL_SIZE_MB = 100;
const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB per file

const SUPPORTED_EXTENSIONS = new Set([
  '.java', '.xml', '.gradle', '.properties', '.sql', '.jsp',
  '.yaml', '.yml', '.json', '.ts', '.tsx', '.js', '.css', '.html', '.md',
  '.py', '.cpp', '.c', '.h', '.php', '.rb', '.go', '.rs', '.kt', '.scala'
]);

const IGNORED_PATTERNS = [
  /node_modules/,
  /\.env.*/,
  /\.env\.production/,
  /\.env\.development/,
  /\.(log|tmp|cache)$/,
  /^node_modules\//,
  /^\.git\//,
  /^\.vscode\//,
  /^target\//,
  /^build\//,
  /^dist\//,
  /^\.next\//,
  /^\.nuxt\//
];

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

function shouldIgnoreFile(path: string): boolean {
  return IGNORED_PATTERNS.some(pattern => pattern.test(path));
}

function isSupportedFile(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.has(ext);
}

function decodeBase64(base64: string): string {
  try {
    const binString = atob(base64.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.warn('TextDecoder failed, falling back to simple atob', e);
    return atob(base64.replace(/\s/g, ''));
  }
}

function detectLanguage(filename: string): string | undefined {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.xml': 'xml',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.html': 'html',
    '.css': 'css',
    '.sql': 'sql',
    '.gradle': 'gradle',
    '.properties': 'properties',
    '.jsp': 'jsp'
  };
  return languageMap[ext];
}

export class GitHubService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'BugBuddy-App',
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    return headers;
  }

  private async request<T>(url: string, requireAuth: boolean = false): Promise<T> {
    const headers = this.getHeaders();

    // For public repositories, try without auth first
    if (!requireAuth && !this.token) {
      try {
        const response = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
        if (response.ok) {
          return response.json();
        }

        // Check for rate limiting
        if (this.isRateLimited(response)) {
          throw new Error('GitHub API rate limit exceeded for unauthenticated requests (60/hour). Please add a GitHub token in Settings for higher limits (5000/hour).');
        }

        // If it fails with 403/404, it might be private or not found
        if (response.status === 403 || response.status === 404) {
          // Continue to try with auth if available
        } else {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        // If it's not a rate limit error, re-throw
        if (error instanceof Error && !error.message.includes('rate limit')) {
          throw error;
        }
        // For rate limit errors, don't try auth, just throw
        throw error;
      }
    }

    // Try with authentication (or retry with auth for public repos that failed)
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (this.isRateLimited(response)) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      if (response.status === 401) {
        throw new Error('Authentication required. This repository may be private - please provide a GitHub token in Settings.');
      }
      if (response.status === 403) {
        throw new Error('Access denied. This repository may be private - please provide a GitHub token in Settings.');
      }
      if (response.status === 404) {
        throw new Error('Repository not found. Please check the repository name and ensure it exists.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private isRateLimited(response: Response): boolean {
    const remaining = response.headers.get('x-ratelimit-remaining');

    // Check if rate limit is exceeded
    if (remaining === '0') {
      return true;
    }

    // Also check for common rate limit indicators
    if (response.status === 403) {
      const retryAfter = response.headers.get('retry-after');
      const rateLimitReset = response.headers.get('x-ratelimit-reset');

      if (retryAfter || rateLimitReset) {
        return true;
      }
    }

    return false;
  }

  async getUserRepos(username?: string): Promise<GitHubRepo[]> {
    const url = username
      ? `${GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=100`
      : `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100`;

    return this.request(url);
  }

  async getRepoBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches?per_page=100`;
    return this.request(url);
  }

  async getRepoContents(owner: string, repo: string, path = '', branch = 'main'): Promise<GitHubFile[]> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    return this.request(url);
  }

  async getFileContent(owner: string, repo: string, path: string, branch = 'main'): Promise<string> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const data = await this.request<{ content: string; encoding: string }>(url);

    if (data.encoding === 'base64') {
      return decodeBase64(data.content);
    }

    return data.content;
  }

  async analyzeGitHubRepo(
    owner: string,
    repo: string,
    branch: string = 'main',
    maxFiles: number = MAX_FILES,
    onProgress?: (msg: string) => void
  ): Promise<{ files: ProjectFile[]; totalSize: number; supportedFiles: number; ignoredFiles: string[] }> {
    const notify = (msg: string) => onProgress && onProgress(msg);

    notify('Checking repository access...');

    // 1. Get repository info to resolve default branch if needed
    let targetRef = branch;
    let isPublic = false;

    try {
      // Try to get repo info (works for public repos without auth)
      const repoData = await this.request<{ default_branch: string; private: boolean }>(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
        false // Don't require auth initially
      );
      targetRef = repoData.default_branch || 'main';
      isPublic = !repoData.private;
      notify(`Repository is ${isPublic ? 'public' : 'private'}. Using branch: ${targetRef}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Authentication required')) {
        notify('Repository appears to be private. Using authentication...');
        // Retry with auth
        const repoData = await this.request<{ default_branch: string; private: boolean }>(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
          true // Require auth for private repos
        );
        targetRef = repoData.default_branch || 'main';
        isPublic = !repoData.private;
      } else {
        throw error;
      }
    }

    // 2. Fetch Git Tree (Recursive)
    notify(`Fetching file tree from ${targetRef}...`);
    const treeUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${targetRef}?recursive=1`;
    const treeRes = await fetch(treeUrl, { headers: this.getHeaders() });

    if (!treeRes.ok) {
      if (treeRes.status === 404) throw new Error(`Branch '${targetRef}' not found.`);
      if (treeRes.status === 409) throw new Error('Repository is empty.');
      throw new Error(`Failed to fetch file tree: ${treeRes.status} ${treeRes.statusText}`);
    }

    const treeData = await treeRes.json();

    if (treeData.truncated) {
      console.warn("Repository tree is truncated by GitHub API.");
    }

    // 3. Filter relevant files
    notify('Filtering supported files...');
    const allBlobs = (treeData.tree as GitHubTreeItem[]).filter(item => item.type === 'blob');

    const relevantItems = allBlobs
      .filter(item => !shouldIgnoreFile(item.path))
      .filter(item => isSupportedFile(item.path))
      .filter(item => (item.size || 0) < MAX_FILE_SIZE_BYTES);

    const limitedItems = relevantItems.slice(0, Math.min(maxFiles, MAX_FILES));

    if (limitedItems.length === 0) {
      throw new Error(`No matching source files found in '${targetRef}'. (Checked: ${Array.from(SUPPORTED_EXTENSIONS).join(', ')})`);
    }

    // 4. Fetch Content (in parallel batches)
    const files: ProjectFile[] = [];
    const ignoredFiles: string[] = [];
    let totalSize = 0;
    let supportedFiles = 0;
    const BATCH_SIZE = 5;
    let downloadedCount = 0;

    for (let i = 0; i < limitedItems.length; i += BATCH_SIZE) {
      if (totalSize >= MAX_TOTAL_SIZE_BYTES) {
        notify(`Stopping: reached ${MAX_TOTAL_SIZE_MB}MB size limit`);
        break;
      }

      const batch = limitedItems.slice(i, i + BATCH_SIZE);
      notify(`Downloading files (${downloadedCount}/${limitedItems.length})...`);

      const results = await Promise.all(batch.map(async (item) => {
        try {
          if (totalSize >= MAX_TOTAL_SIZE_BYTES) return null;

          const blobRes = await fetch(item.url, { headers: this.getHeaders() });
          if (!blobRes.ok) return null;

          const blobData = await blobRes.json();
          const content = decodeBase64(blobData.content);

          if (totalSize + content.length > MAX_TOTAL_SIZE_BYTES) {
            notify(`Skipping ${item.path}: would exceed ${MAX_TOTAL_SIZE_MB}MB limit`);
            return null;
          }

          return {
            path: item.path,
            content,
            language: detectLanguage(item.path),
            size: content.length
          };
        } catch (e) {
          console.error(`Failed to fetch ${item.path}`, e);
          return null;
        }
      }));

      results.forEach(result => {
        if (result) {
          files.push(result);
          totalSize += result.content.length;
          supportedFiles++;
          downloadedCount++;
        }
      });
    }

    notify('Finalizing...');

    return {
      files,
      totalSize,
      supportedFiles,
      ignoredFiles
    };
  }
}

// Export the fetchGithubRepo function for direct use
export interface RepoImportResult {
  files: ProjectFile[];
  summary: string;
  truncated: boolean;
}

export async function fetchGithubRepo(
  repoString: string,
  branch: string = '',
  token?: string,
  onProgress?: (msg: string) => void
): Promise<RepoImportResult> {
  const notify = (msg: string) => onProgress && onProgress(msg);

  // 1. Parse repo string (owner/repo)
  notify('Parsing repository info...');
  let owner = '';
  let repo = '';

  const clean = repoString.replace('https://github.com/', '').replace(/\/$/, '');
  const parts = clean.split('/');
  if (parts.length >= 2) {
    owner = parts[0];
    repo = parts[1];
    console.log('Parsed repository:', { owner, repo, original: repoString });
  } else {
    throw new Error("Invalid repository format. Use 'owner/repo' or full URL.");
  }

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  // 2. Determine Branch/Tag
  let targetRef = branch;
  if (!targetRef) {
    notify('Resolving default branch...');
    console.log('Fetching repo info for:', `${owner}/${repo}`);
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    console.log('Repo fetch response:', repoRes.status, repoRes.statusText);

    if (!repoRes.ok) {
      if (repoRes.status === 404) throw new Error(`Repository not found: ${owner}/${repo}`);
      if (repoRes.status === 401) throw new Error(`Unauthorized. Check your token.`);
      if (repoRes.status === 403) {
        if (repoRes.headers.get('x-ratelimit-remaining') === '0') {
          throw new Error(`GitHub API rate limit exceeded. Unauthenticated requests are limited to 60/hour. Add a GitHub token in Settings for 5000/hour.`);
        }
        throw new Error(`Access denied. Repository may be private.`);
      }
      throw new Error(`GitHub API Error: ${repoRes.statusText}`);
    }

    const repoData = await repoRes.json();
    console.log('Repo data:', { name: repoData.name, private: repoData.private, default_branch: repoData.default_branch });

    if (repoData.private && !token) {
      throw new Error(`Repository ${owner}/${repo} is private. Please provide a GitHub token in Settings to access private repositories.`);
    }

    targetRef = repoData.default_branch || 'main';
  }

  // 3. Fetch Tree (Recursive)
  notify(`Fetching file tree (${targetRef})...`);
  console.log('Fetching tree from:', `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetRef}?recursive=1`);
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetRef}?recursive=1`;
  const treeRes = await fetch(treeUrl, { headers });
  console.log('Tree fetch response:', treeRes.status, treeRes.statusText);

  if (!treeRes.ok) {
    if (treeRes.status === 404) throw new Error(`Branch or tag '${targetRef}' not found.`);
    if (treeRes.status === 409) throw new Error(`Repository is empty or uninitialized.`);
    if (treeRes.status === 403) {
      if (treeRes.headers.get('x-ratelimit-remaining') === '0') {
        throw new Error(`GitHub API rate limit exceeded. Please try again later or add a GitHub token.`);
      }
      throw new Error(`Access denied. Repository may be private or you may not have permission to access it.`);
    }
    throw new Error(`Failed to fetch file tree: ${treeRes.status} ${treeRes.statusText}`);
  }

  const treeData = await treeRes.json();
  console.log('Tree data received, truncated:', treeData.truncated, 'tree items:', treeData.tree?.length || 0);

  if (treeData.truncated) {
    console.warn("Repository tree is truncated by GitHub API.");
  }

  // Check if repository has any files
  if (!treeData.tree || treeData.tree.length === 0) {
    throw new Error(`Repository ${owner}/${repo} appears to be empty or has no commits.`);
  }

  // 4. Filter relevant files
  notify('Filtering source files...');
  const allBlobs = (treeData.tree as GitHubTreeItem[]).filter(item => item.type === 'blob');

  const relevantItems = allBlobs
    .filter(item => !shouldIgnoreFile(item.path))
    .filter(item => isSupportedFile(item.path))
    .filter(item => (item.size || 0) < MAX_FILE_SIZE_BYTES);

  const limitedItems = relevantItems.slice(0, MAX_FILES);
  const isTruncated = treeData.truncated || limitedItems.length < relevantItems.length;

  if (limitedItems.length === 0) {
    throw new Error(`No matching source files found in '${targetRef}'. (Checked: ${Array.from(SUPPORTED_EXTENSIONS).join(', ')})`);
  }

   // 5. Fetch Content (in parallel batches with retry logic)
   const files: ProjectFile[] = [];
   const BATCH_SIZE = 3; // Smaller batch size to be more rate-limit friendly
   let downloadedCount = 0;
   let failedCount = 0;

   async function fetchFileWithRetry(item: GitHubTreeItem, retries = 3): Promise<ProjectFile | null> {
     for (let attempt = 0; attempt < retries; attempt++) {
       try {
         const content = await githubService.getFileContent(owner, repo, item.path, targetRef);
         return {
           path: item.path,
           content,
           language: detectLanguage(item.path),
           size: content.length
         };
       } catch (e) {
         console.warn(`Attempt ${attempt + 1} failed for ${item.path}:`, e);
         if (attempt === retries - 1) {
           console.error(`Failed to fetch ${item.path} after ${retries} attempts`);
           return null;
         }
         // Wait before retry (exponential backoff)
         await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
       }
     }
     return null;
   }

   for (let i = 0; i < limitedItems.length; i += BATCH_SIZE) {
     const batch = limitedItems.slice(i, i + BATCH_SIZE);
     notify(`Downloading files (${downloadedCount}/${limitedItems.length})...`);

     const results = await Promise.all(batch.map(item => fetchFileWithRetry(item)));

     results.forEach(r => {
       if (r) {
         files.push(r);
         downloadedCount++;
       } else {
         failedCount++;
       }
     });

     // Add a small delay between batches to be more rate-limit friendly
     if (i + BATCH_SIZE < limitedItems.length) {
       await new Promise(resolve => setTimeout(resolve, 200));
     }
   }

   notify('Finalizing...');

   const summary = failedCount > 0
     ? `Imported ${files.length} files from ${targetRef} (${failedCount} failed). ${isTruncated ? '(Some files skipped due to size/limits)' : ''}`
     : `Imported ${files.length} files from ${targetRef}. ${isTruncated ? '(Some files skipped due to size/limits)' : ''}`;

   return {
     files,
     truncated: isTruncated || failedCount > 0,
     summary
   };
}

export const githubService = new GitHubService();