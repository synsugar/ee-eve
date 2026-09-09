export type FileTreeNode =
  | { kind: "file"; name: string; path: string }
  | { kind: "dir"; name: string; path: string; children: FileTreeNode[] };

export function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const dirs = new Map<string, FileTreeNode[]>();
  dirs.set("", root);

  for (const filePath of [...paths].sort((left, right) => left.localeCompare(right))) {
    const parts = filePath.split("/").filter((part) => part.length > 0);
    let prefix = "";

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (part === undefined) {
        continue;
      }
      const isFile = index === parts.length - 1;
      const nextPrefix = prefix.length === 0 ? part : `${prefix}/${part}`;
      const parent = dirs.get(prefix);
      if (parent === undefined) {
        break;
      }

      if (isFile) {
        if (!parent.some((node) => node.kind === "file" && node.path === filePath)) {
          parent.push({ kind: "file", name: part, path: filePath });
        }
        continue;
      }

      if (!dirs.has(nextPrefix)) {
        const children: FileTreeNode[] = [];
        dirs.set(nextPrefix, children);
        parent.push({ kind: "dir", name: part, path: nextPrefix, children });
      }
      prefix = nextPrefix;
    }
  }

  sortTree(root);
  return root;
}

export function collectDirPaths(nodes: FileTreeNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.kind === "dir") {
      paths.push(node.path);
      paths.push(...collectDirPaths(node.children));
    }
  }
  return paths;
}

function sortTree(nodes: FileTreeNode[]): void {
  nodes.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "dir" ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
  for (const node of nodes) {
    if (node.kind === "dir") {
      sortTree(node.children);
    }
  }
}
