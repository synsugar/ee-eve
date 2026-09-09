import { exec } from "node:child_process";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isInside,
  listAgentFiles,
  readAgentFile,
  readNumberedTextFile,
  resolveAgentHostPath,
  writeAgentFile,
} from "@/lib/agent-fs";

export type DemoFileScope = "agent" | "workspace";

export function getWorkspaceRoot(): string {
  return path.resolve(process.cwd(), "workspace");
}

export async function ensureWorkspaceRoot(): Promise<string> {
  const root = getWorkspaceRoot();
  await mkdir(root, { recursive: true });
  return root;
}

export function parseDemoFilePath(raw: string): { scope: DemoFileScope; relativePath: string } {
  const normalized = raw.replaceAll("\\", "/").replace(/^\.?\//, "");
  if (normalized.startsWith("workspace/")) {
    return { scope: "workspace", relativePath: normalized.slice("workspace/".length) };
  }
  if (normalized.startsWith("agent/")) {
    return { scope: "agent", relativePath: normalized.slice("agent/".length) };
  }
  return { scope: "agent", relativePath: normalized };
}

export async function listDemoFiles(): Promise<string[]> {
  const agent = (await listAgentFiles()).map((relativePath) => `agent/${relativePath}`);
  const workspace = (await listWorkspaceFiles()).map((relativePath) => `workspace/${relativePath}`);
  return [...agent, ...workspace];
}

export async function readDemoFile(listedPath: string): Promise<string> {
  const { scope, relativePath } = parseDemoFilePath(listedPath);
  if (scope === "agent") {
    return readAgentFile(relativePath);
  }
  return readWorkspaceFile(relativePath);
}

export async function writeDemoFile(listedPath: string, content: string): Promise<void> {
  const { scope, relativePath } = parseDemoFilePath(listedPath);
  if (scope === "agent") {
    await writeAgentFile(relativePath, content);
    return;
  }
  await writeWorkspaceFile(relativePath, content);
}

export async function listWorkspaceFiles(): Promise<string[]> {
  const root = getWorkspaceRoot();
  const info = await stat(root).catch(() => null);
  if (info === null || !info.isDirectory()) {
    return [];
  }

  const files: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (entry.isFile()) {
        files.push(toWorkspaceRelativePath(absolutePath));
      }
    }
  }

  await walk(root);
  files.sort((left, right) => left.localeCompare(right));
  return files;
}

export async function writeHostWorkspaceFile(
  relativePath: string,
  content: string,
): Promise<{ existed: boolean; path: string }> {
  const absolutePath = resolveWorkspacePath(relativePath);
  const info = await stat(absolutePath).catch(() => null);
  if (info?.isDirectory()) {
    throw new Error("Refusing to overwrite a directory");
  }
  const existed = info?.isFile() ?? false;
  await writeWorkspaceFile(relativePath, content);
  return { existed, path: `/workspace/${relativePath}` };
}

export async function readHostWorkspaceFile(relativePath: string, offset?: number, limit?: number) {
  return readNumberedTextFile(
    resolveWorkspacePath(relativePath),
    `/workspace/${relativePath}`,
    offset,
    limit,
  );
}

export async function runHostWorkspaceBash(command: string): Promise<{
  exitCode: number;
  stderr: string;
  stdout: string;
  truncated: boolean;
}> {
  const cwd = await ensureWorkspaceRoot();
  return await new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd,
        env: process.env,
        maxBuffer: 5 * 1024 * 1024,
        shell: "/bin/bash",
        timeout: 60_000,
      },
      (error, stdout, stderr) => {
        if (error && error.killed) {
          reject(new Error("bash timed out after 60s"));
          return;
        }
        const exitCode =
          error && typeof error.code === "number"
            ? error.code
            : error
              ? 1
              : 0;
        resolve({
          exitCode,
          stderr,
          stdout,
          truncated: false,
        });
      },
    );
  });
}

export async function resetWorkspace(): Promise<void> {
  await rm(getWorkspaceRoot(), { force: true, recursive: true });
  await ensureWorkspaceRoot();
}

/**
 * Map a model-facing sandbox path onto host `workspace/`.
 * Returns null for agent/ paths (those belong on host `agent/`).
 */
export function sandboxPathToWorkspaceRelative(filePath: string): string | null {
  if (resolveAgentHostPath(filePath) !== null) {
    return null;
  }

  let normalized = filePath.replaceAll("\\", "/").trim();
  if (normalized.startsWith("$HOME")) {
    return null;
  }
  if (normalized === "/workspace") {
    return null;
  }
  if (normalized.startsWith("/workspace/")) {
    normalized = normalized.slice("/workspace/".length);
  }

  const resolvedAbsolute = path.resolve(normalized);
  if (resolvedAbsolute === getWorkspaceRoot() || isInside(getWorkspaceRoot(), resolvedAbsolute)) {
    return toWorkspaceRelativePath(resolvedAbsolute);
  }

  normalized = normalized.replace(/^\.\//, "");
  if (normalized.length === 0 || normalized.includes("..") || normalized.startsWith("/")) {
    return null;
  }
  return normalized;
}

async function readWorkspaceFile(relativePath: string): Promise<string> {
  const absolutePath = resolveWorkspacePath(relativePath);
  const info = await stat(absolutePath);
  if (!info.isFile()) {
    throw new Error("Not a file");
  }
  return readFile(absolutePath, "utf8");
}

async function writeWorkspaceFile(relativePath: string, content: string): Promise<void> {
  const absolutePath = resolveWorkspacePath(relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

function toWorkspaceRelativePath(absolutePath: string): string {
  const relative = path.relative(getWorkspaceRoot(), absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path is not inside workspace/");
  }
  return relative.split(path.sep).join("/");
}

function resolveWorkspacePath(relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.?\//, "");
  if (normalized.length === 0 || normalized.includes("..")) {
    throw new Error("Invalid path");
  }
  const absolutePath = path.resolve(getWorkspaceRoot(), normalized);
  if (!isInside(getWorkspaceRoot(), absolutePath)) {
    throw new Error("Path is not inside workspace/");
  }
  return absolutePath;
}
