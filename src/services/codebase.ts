// ============================================================
// Codebase Analysis Service
// ============================================================

import { CodebaseFile, CodebaseAnalysis } from '../types';
import { githubService } from './github';

const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.java', '.py', '.cpp', '.c', '.cs', '.php',
  '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj', '.hs', '.ml', '.fs',
  '.vb', '.pl', '.lua', '.r', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.sql',
  '.xml', '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
  '.dart', '.ex', '.exs', '.cr', '.nim', '.zig', '.v', '.jl', '.sol',
  '.graphql', '.gql', '.groovy', '.gradle', '.coffee', '.cson', '.elm',
  '.purs', '.re', '.rei', '.fst', '.fsti', '.asm', '.s', '.m', '.mm',
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
  '.wasm'
]);

const IGNORED_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /\.next/,
  /\.nuxt/,
  /coverage/,
  /\.DS_Store/,
  /Thumbs\.db/,
  /\.(log|tmp|cache|tmp)$/,
  /package-lock\.json/,
  /yarn\.lock/,
  /pnpm-lock\.yaml/,
  /\.env/,
  /\.env\.local/,
  /\.env\.production/,
  /\.env\.development/,
  /\.(log|tmp|cache)$/
];

function isSupportedFile(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.has(ext);
}

function shouldIgnoreFile(path: string): boolean {
  return IGNORED_PATTERNS.some(pattern => pattern.test(path));
}

function detectLanguage(filename: string): string | undefined {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.java': 'java',
    '.py': 'python',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.clj': 'clojure',
    '.hs': 'haskell',
    '.ml': 'ocaml',
    '.fs': 'fsharp',
    '.vb': 'vbnet',
    '.pl': 'perl',
    '.lua': 'lua',
    '.r': 'r',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.fish': 'shell',
    '.ps1': 'powershell',
    '.sql': 'sql',
    '.xml': 'xml',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.ini': 'ini',
    '.cfg': 'ini',
    '.conf': 'ini',
    '.dart': 'dart',
    '.ex': 'elixir',
    '.exs': 'elixir',
    '.cr': 'crystal',
    '.nim': 'nim',
    '.zig': 'zig',
    '.v': 'v',
    '.jl': 'julia',
    '.sol': 'solidity',
    '.graphql': 'graphql',
    '.gql': 'graphql',
    '.groovy': 'groovy',
    '.gradle': 'groovy',
    '.coffee': 'coffeescript',
    '.cson': 'coffeescript',
    '.elm': 'elm',
    '.purs': 'purescript',
    '.re': 'reason',
    '.rei': 'reason',
    '.fst': 'fstar',
    '.fsti': 'fstar',
    '.asm': 'assembly',
    '.s': 'assembly',
    '.m': 'objectivec',
    '.mm': 'objectivec',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.wasm': 'webassembly'
  };

  return languageMap[ext];
}

export class CodebaseService {
  async analyzeGitHubRepo(owner: string, repo: string, branch = 'main', maxFiles = 1000): Promise<CodebaseAnalysis> {
    try {
      const result = await githubService.analyzeGitHubRepo(owner, repo, branch, maxFiles);

      if (result.supportedFiles === 0) {
        throw new Error('No supported code files found in the repository. BugBuddy supports JavaScript, TypeScript, Java, Python, Go, C/C++, C#, PHP, Ruby, Rust, Swift, Kotlin, Scala, Haskell, Clojure, Elixir, Crystal, Dart, Nim, Zig, V, Julia, Solidity, GraphQL, Groovy, CoffeeScript, Elm, PureScript, Reason, F*, Assembly, Objective-C, HTML, CSS, SCSS, Sass, Less, Vue, Svelte, WebAssembly, and many other languages.');
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw GitHub service errors as-is
        if (error.message.includes('GitHub API error') ||
            error.message.includes('Invalid GitHub token') ||
            error.message.includes('Repository or resource not found') ||
            error.message.includes('Branch') ||
            error.message.includes('Repository is empty')) {
          throw error;
        }
        throw new Error(`Failed to analyze repository: ${error.message}`);
      }
      throw new Error('Failed to analyze repository: Unknown error occurred');
    }
  }



  async analyzeUploadedFiles(fileList: FileList): Promise<CodebaseAnalysis> {
    const files: CodebaseFile[] = [];
    const ignoredFiles: string[] = [];
    let totalSize = 0;
    let supportedFiles = 0;

    if (fileList.length === 0) {
      throw new Error('No files selected for analysis');
    }

    const processFile = async (file: File): Promise<void> => {
      try {
        // Check file size limit (10MB per file)
        if (file.size > 10 * 1024 * 1024) {
          ignoredFiles.push(`${file.name} (file too large: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
          return;
        }

        if (shouldIgnoreFile(file.name)) {
          ignoredFiles.push(`${file.name} (ignored pattern)`);
          return;
        }

        if (isSupportedFile(file.name)) {
          const content = await file.text();

          // Check for binary files (simple heuristic)
          if (content.includes('\x00')) {
            ignoredFiles.push(`${file.name} (appears to be binary)`);
            return;
          }

          const filePath = (file as any).webkitRelativePath || file.name;
          const codebaseFile: CodebaseFile = {
            path: filePath,
            content,
            size: file.size,
            language: detectLanguage(file.name)
          };

          files.push(codebaseFile);
          totalSize += file.size;
          supportedFiles++;
        } else {
          ignoredFiles.push(`${file.name} (unsupported format)`);
        }
      } catch (error) {
        ignoredFiles.push(`${file.name} (read error: ${error instanceof Error ? error.message : 'unknown'})`);
      }
    };

    try {
      const promises: Promise<void>[] = [];
      for (let i = 0; i < fileList.length; i++) {
        promises.push(processFile(fileList[i]));
      }

      await Promise.all(promises);

      if (supportedFiles === 0) {
        const supportedExtensions = Array.from(SUPPORTED_EXTENSIONS).join(', ');
        throw new Error(`No supported code files found. BugBuddy supports: ${supportedExtensions}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('No supported code files')) {
        throw error;
      }
      throw new Error(`Failed to process uploaded files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      files,
      totalSize,
      supportedFiles,
      ignoredFiles
    };
  }
}

export const codebaseService = new CodebaseService();