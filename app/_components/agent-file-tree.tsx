"use client";

import { ChevronRightIcon, FileCodeIcon, FileIcon, FileTextIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileTreeNode } from "@/lib/file-tree";

export function AgentFileTree({
  nodes,
  selectedPath,
  collapsed,
  onToggleDir,
  onOpenFile,
}: {
  readonly nodes: FileTreeNode[];
  readonly selectedPath?: string;
  readonly collapsed: ReadonlySet<string>;
  readonly onToggleDir: (path: string) => void;
  readonly onOpenFile: (path: string) => void;
}) {
  return (
    <ul className="flex flex-col py-1">
      {nodes.map((node) => (
        <TreeItem
          collapsed={collapsed}
          key={node.path}
          node={node}
          onOpenFile={onOpenFile}
          onToggleDir={onToggleDir}
          selectedPath={selectedPath}
          depth={0}
        />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  depth,
  selectedPath,
  collapsed,
  onToggleDir,
  onOpenFile,
}: {
  readonly node: FileTreeNode;
  readonly depth: number;
  readonly selectedPath?: string;
  readonly collapsed: ReadonlySet<string>;
  readonly onToggleDir: (path: string) => void;
  readonly onOpenFile: (path: string) => void;
}) {
  const paddingLeft = 8 + depth * 12;

  if (node.kind === "file") {
    const selected = node.path === selectedPath;
    const Icon = fileIcon(node.name);
    return (
      <li>
        <button
          className={cn(
            "flex w-full items-center gap-1.5 rounded-sm py-1 pr-2 text-left text-[13px] leading-5 hover:bg-accent",
            selected && "bg-accent font-medium text-foreground",
          )}
          onClick={() => onOpenFile(node.path)}
          style={{ paddingLeft }}
          type="button"
        >
          <span className="size-3 shrink-0" />
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{node.name}</span>
        </button>
      </li>
    );
  }

  const open = !collapsed.has(node.path);
  const Folder = open ? FolderOpenIcon : FolderIcon;

  return (
    <li>
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-1 rounded-sm py-1 pr-2 text-left text-[13px] leading-5 text-foreground hover:bg-accent"
        onClick={() => onToggleDir(node.path)}
        style={{ paddingLeft }}
        type="button"
      >
        <ChevronRightIcon
          className={cn("size-3 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
        />
        <Folder className="size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {open ? (
        <ul>
          {node.children.map((child) => (
            <TreeItem
              collapsed={collapsed}
              depth={depth + 1}
              key={child.path}
              node={child}
              onOpenFile={onOpenFile}
              onToggleDir={onToggleDir}
              selectedPath={selectedPath}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function fileIcon(name: string) {
  if (name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".js") || name.endsWith(".jsx")) {
    return FileCodeIcon;
  }
  if (name.endsWith(".md") || name.endsWith(".mdx")) {
    return FileTextIcon;
  }
  return FileIcon;
}
