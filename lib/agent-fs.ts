import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PROTECTED_RELATIVE_PATHS = new Set([
  "tools/write_file.ts",
  "tools/read_file.ts",
  "tools/bash.ts",
]);

export function isLocalAgentFsEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function getAgentRoot(): string {
  return path.resolve(process.cwd(), "agent");
}

export function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * Map a model-facing path onto the host `agent/` directory.
 * Returns null when the path should stay in the sandbox.
 */
export function resolveAgentHostPath(filePath: string): string | null {
  const normalized = filePath.replaceAll("\\", "/").trim();
  if (normalized.length === 0) {
    return null;
  }

  let relative: string | undefined;

  if (normalized === "agent" || normalized === "/agent" || normalized === "/workspace/agent") {
    return getAgentRoot();
  }

  if (normalized.startsWith("agent/")) {
    relative = normalized.slice("agent/".length);
  } else if (normalized.startsWith("/agent/")) {
    relative = normalized.slice("/agent/".length);
  } else if (normalized.startsWith("/workspace/agent/")) {
    relative = normalized.slice("/workspace/agent/".length);
  } else {
    const resolved = path.resolve(normalized);
    if (resolved === getAgentRoot() || isInside(getAgentRoot(), resolved)) {
      return resolved;
    }
    return null;
  }

  const resolved = path.resolve(getAgentRoot(), relative);
  if (resolved !== getAgentRoot() && !isInside(getAgentRoot(), resolved)) {
    throw new Error("Refusing to write outside agent/");
  }
  return resolved;
}

export function toAgentRelativePath(absolutePath: string): string {
  const relative = path.relative(getAgentRoot(), absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path is not inside agent/");
  }
  return relative.split(path.sep).join("/");
}

export function isProtectedAgentPath(absolutePath: string): boolean {
  return PROTECTED_RELATIVE_PATHS.has(toAgentRelativePath(absolutePath));
}

export async function listAgentFiles(): Promise<string[]> {
  const root = getAgentRoot();
  const files: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (entry.isFile()) {
        files.push(toAgentRelativePath(absolutePath));
      }
    }
  }

  await walk(root);
  files.sort((left, right) => left.localeCompare(right));
  return files;
}

export async function readAgentFile(relativePath: string): Promise<string> {
  const absolutePath = resolveRelativeAgentPath(relativePath);
  const info = await stat(absolutePath);
  if (!info.isFile()) {
    throw new Error("Not a file");
  }
  return readFile(absolutePath, "utf8");
}

export async function writeAgentFile(relativePath: string, content: string): Promise<void> {
  const absolutePath = resolveRelativeAgentPath(relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

export async function writeHostAgentFile(
  absolutePath: string,
  content: string,
): Promise<{ existed: boolean; path: string }> {
  if (isProtectedAgentPath(absolutePath)) {
    throw new Error(
      `Refusing to overwrite ${toAgentRelativePath(absolutePath)}; that file is the localhost sandbox hole.`,
    );
  }

  const info = await stat(absolutePath).catch(() => null);
  if (info?.isDirectory()) {
    throw new Error("Refusing to overwrite a directory");
  }
  const existed = info?.isFile() ?? false;

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
  return { existed, path: `agent/${toAgentRelativePath(absolutePath)}` };
}

export async function readNumberedTextFile(
  absolutePath: string,
  displayPath: string,
  offset?: number,
  limit?: number,
): Promise<{
  content: string;
  nextOffset?: number;
  path: string;
  totalLines: number;
  truncated: boolean;
}> {
  const raw = await readFile(absolutePath, "utf8");
  if (raw.includes("\0")) {
    throw new Error("read_file only supports text files");
  }

  const lines = raw.split("\n");
  const totalLines = lines.length > 0 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
  const start = offset ?? 1;
  const maxLines = limit ?? 2000;

  if (start < 1) {
    throw new Error(`offset must be >= 1. Received: ${start}.`);
  }
  if (totalLines === 0) {
    if (start > 1) {
      throw new Error("offset is past the end of the file (0 lines).");
    }
    return {
      content: "",
      path: displayPath,
      totalLines: 0,
      truncated: false,
    };
  }
  if (start > totalLines) {
    throw new Error(`offset ${start} is past the end of the file (${totalLines} lines).`);
  }

  const slice = lines.slice(start - 1, start - 1 + maxLines);
  const numbered = slice.map((line, index) => `${start + index}: ${line}`);
  const truncated = start - 1 + slice.length < totalLines;

  return {
    content: numbered.join("\n"),
    nextOffset: truncated ? start + slice.length : undefined,
    path: displayPath,
    totalLines,
    truncated,
  };
}

export async function readHostAgentFile(
  absolutePath: string,
  offset?: number,
  limit?: number,
) {
  return readNumberedTextFile(absolutePath, `agent/${toAgentRelativePath(absolutePath)}`, offset, limit);
}

function resolveRelativeAgentPath(relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.?\//, "");
  if (normalized.length === 0 || normalized.includes("..")) {
    throw new Error("Invalid path");
  }
  const absolutePath = path.resolve(getAgentRoot(), normalized);
  if (!isInside(getAgentRoot(), absolutePath)) {
    throw new Error("Path is not inside agent/");
  }
  return absolutePath;
}

export async function resetAgentToGitHead(): Promise<void> {
  const cwd = process.cwd();
  await execFileAsync("git", ["restore", "--source=HEAD", "--worktree", "--staged", "--", "agent"], {
    cwd,
  });
  await execFileAsync("git", ["clean", "-fd", "--", "agent"], { cwd });
}
