"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { AgentFileTree } from "@/app/_components/agent-file-tree";
import { HighlightedEditor } from "@/app/_components/highlighted-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildFileTree } from "@/lib/file-tree";

export function AgentFilesPanel() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>();
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [newPath, setNewPath] = useState("");
  const [error, setError] = useState<string>();
  const [resetting, setResetting] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const dirty = selectedPath !== undefined && content !== savedContent;
  const tree = useMemo(() => buildFileTree(files), [files]);

  const refreshFiles = useCallback(async () => {
    const response = await fetch("/api/agent-files");
    if (!response.ok) {
      throw new Error("Could not list agent files.");
    }
    const payload = (await response.json()) as { files: string[] };
    setFiles(payload.files);
    return payload.files;
  }, []);

  const loadFile = useCallback(async (relativePath: string) => {
    const response = await fetch(`/api/agent-files?path=${encodeURIComponent(relativePath)}`);
    if (!response.ok) {
      throw new Error("Could not read file.");
    }
    const payload = (await response.json()) as { content: string };
    setSelectedPath(relativePath);
    setContent(payload.content);
    setSavedContent(payload.content);
  }, []);

  const saveFile = useCallback(async () => {
    if (selectedPath === undefined) {
      return;
    }
    const response = await fetch("/api/agent-files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedPath, content }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Could not save file.");
    }
    setSavedContent(content);
  }, [content, selectedPath]);

  const openFile = useCallback(
    (relativePath: string) => {
      if (dirty) {
        const ok = window.confirm("Discard unsaved changes?");
        if (!ok) {
          return;
        }
      }
      setError(undefined);
      void loadFile(relativePath).catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Could not open file.");
      });
    },
    [dirty, loadFile],
  );

  useEffect(() => {
    if (selectedPath !== undefined || files.length === 0) {
      return;
    }
    const initial = files.includes("agent/instructions.md")
      ? "agent/instructions.md"
      : files[0];
    if (initial === undefined) {
      return;
    }
    void loadFile(initial).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not load files.");
    });
  }, [files, loadFile, selectedPath]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        void saveFile().catch((caught: unknown) => {
          setError(caught instanceof Error ? caught.message : "Could not save.");
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveFile]);

  useEffect(() => {
    const source = new EventSource("/api/agent-files/events");
    let timeout: number | undefined;
    source.onmessage = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        void refreshFiles()
          .then((listed) => {
            if (dirty) {
              return;
            }
            const pathToLoad = selectedPath ?? listed[0];
            if (pathToLoad === undefined) {
              return;
            }
            return loadFile(pathToLoad);
          })
          .catch((caught: unknown) => {
            setError(caught instanceof Error ? caught.message : "Could not refresh files.");
          });
      }, 200);
    };
    return () => {
      window.clearTimeout(timeout);
      source.close();
    };
  }, [dirty, loadFile, refreshFiles, selectedPath]);

  useEffect(() => {
    void refreshFiles().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not load files.");
    });
  }, [refreshFiles]);

  const createFile = async () => {
    const relativePath = newPath.replaceAll("\\", "/").replace(/^\.?\//, "");
    if (relativePath.length === 0) {
      return;
    }
    setError(undefined);
    const response = await fetch("/api/agent-files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: relativePath, content: "" }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not create file.");
      return;
    }
    setNewPath("");
    await refreshFiles();
    await loadFile(relativePath);
  };

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div>
          <p className="font-medium text-sm">Files</p>
          <p className="text-muted-foreground text-xs">Same files the agent reads and writes</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            disabled={resetting}
            onClick={() => {
              const ok = window.confirm(
                "Reset agent/ to the last git commit and delete workspace/ files? Untracked files under agent/ will be deleted.",
              );
              if (!ok) {
                return;
              }
              setResetting(true);
              setError(undefined);
              void fetch("/api/agent-files/reset", { method: "POST" })
                .then(async (response) => {
                  if (!response.ok) {
                    const payload = (await response.json()) as { error?: string };
                    throw new Error(payload.error ?? "Could not reset.");
                  }
                  setSelectedPath(undefined);
                  setContent("");
                  setSavedContent("");
                  return refreshFiles();
                })
                .catch((caught: unknown) => {
                  setError(caught instanceof Error ? caught.message : "Could not reset.");
                })
                .finally(() => {
                  setResetting(false);
                });
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <RotateCcwIcon />
            Reset
          </Button>
          <Button
            disabled={!dirty}
            onClick={() =>
              void saveFile().catch((caught: unknown) => {
                setError(caught instanceof Error ? caught.message : "Could not save.");
              })
            }
            size="sm"
            type="button"
          >
            <SaveIcon />
            Save
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-56 shrink-0 flex-col border-r bg-muted/40">
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            <AgentFileTree
              collapsed={collapsed}
              nodes={tree}
              onOpenFile={openFile}
              onToggleDir={(path) => {
                setCollapsed((previous) => {
                  const next = new Set(previous);
                  if (next.has(path)) {
                    next.delete(path);
                  } else {
                    next.add(path);
                  }
                  return next;
                });
              }}
              selectedPath={selectedPath}
            />
          </div>
          <form
            className="flex gap-1 border-t p-2"
            onSubmit={(event) => {
              event.preventDefault();
              void createFile();
            }}
          >
            <Input
              className="h-8 text-xs"
              onChange={(event) => setNewPath(event.target.value)}
              placeholder="agent/tools/foo.ts"
              value={newPath}
            />
            <Button size="icon-sm" type="submit" variant="outline">
              <PlusIcon />
            </Button>
          </form>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b px-3 py-2 font-mono text-muted-foreground text-xs">
            {selectedPath ?? "No file selected"}
            {dirty ? " · unsaved" : ""}
          </div>
          <HighlightedEditor onChange={setContent} path={selectedPath} value={content} />
          {error ? <p className="border-t px-3 py-2 text-destructive text-xs">{error}</p> : null}
        </div>
      </div>
    </aside>
  );
}
