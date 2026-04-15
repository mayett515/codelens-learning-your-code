import { fileId as makeFileId } from '../domain/types';
import { uid } from './uid';
import type { FileId, ProjectId } from '../domain/types';

export interface GitHubFile {
  id: FileId;
  projectId: ProjectId;
  path: string;
  content: string;
}

interface GitHubTreeItem {
  path: string;
  type: string;
  sha: string;
  url: string;
}

interface GitHubTreeResponse {
  tree: GitHubTreeItem[];
  truncated: boolean;
}

function parseGitHubUrl(url: string): { owner: string; repo: string; branch: string } | null {
  const cleaned = url.replace(/\/+$/, '');
  const match = cleaned.match(
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/]+))?$/,
  );
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    branch: match[3] ?? 'main',
  };
}

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.txt', '.yml', '.yaml', '.toml',
  '.css', '.scss', '.less', '.html', '.xml', '.svg',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.kts',
  '.c', '.h', '.cpp', '.hpp', '.cs', '.swift', '.m',
  '.sh', '.bash', '.zsh', '.fish', '.ps1',
  '.sql', '.graphql', '.gql', '.prisma',
  '.env', '.gitignore', '.eslintrc', '.prettierrc',
  '.dockerfile', '.editorconfig', '.lock',
]);

function isTextFile(path: string): boolean {
  if (path.includes('.')) {
    const ext = '.' + path.split('.').pop()!.toLowerCase();
    return TEXT_EXTENSIONS.has(ext);
  }
  const basename = path.split('/').pop()!.toLowerCase();
  return ['makefile', 'dockerfile', 'readme', 'license', 'changelog'].includes(basename);
}

export async function fetchGitHubRepo(
  url: string,
  projectId: ProjectId,
): Promise<GitHubFile[]> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) throw new Error('Invalid GitHub URL');

  const { owner, repo, branch } = parsed;

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
  );
  if (!treeRes.ok) {
    if (treeRes.status === 404) {
      const fallbackBranch = branch === 'main' ? 'master' : 'main';
      const retryRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${fallbackBranch}?recursive=1`,
      );
      if (!retryRes.ok) throw new Error(`GitHub API error: ${retryRes.status}`);
      const retryData = (await retryRes.json()) as GitHubTreeResponse;
      return fetchFiles(retryData.tree, owner, repo, fallbackBranch, projectId);
    }
    throw new Error(`GitHub API error: ${treeRes.status}`);
  }

  const treeData = (await treeRes.json()) as GitHubTreeResponse;
  return fetchFiles(treeData.tree, owner, repo, branch, projectId);
}

async function fetchFiles(
  tree: GitHubTreeItem[],
  owner: string,
  repo: string,
  branch: string,
  projectId: ProjectId,
): Promise<GitHubFile[]> {
  const blobs = tree.filter((item) => item.type === 'blob' && isTextFile(item.path));

  const files: GitHubFile[] = [];
  const batchSize = 10;

  for (let i = 0; i < blobs.length; i += batchSize) {
    const batch = blobs.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`;
        const res = await fetch(rawUrl);
        if (!res.ok) return null;
        const content = await res.text();
        return {
          id: makeFileId(uid()),
          projectId,
          path: item.path,
          content,
        };
      }),
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        files.push(r.value);
      }
    }
  }

  return files;
}

export function extractRepoName(url: string): string | null {
  const parsed = parseGitHubUrl(url);
  return parsed ? parsed.repo : null;
}
