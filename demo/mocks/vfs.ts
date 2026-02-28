/**
 * In-memory Virtual File System for demo mode.
 * Replaces Tauri's file system commands with a Map-based store.
 */

const files = new Map<string, string>();

export function vfsRead(path: string): string {
  const content = files.get(path);
  if (content === undefined) throw `File not found: ${path}`;
  return content;
}

export function vfsWrite(path: string, content: string): void {
  files.set(path, content);
}

export function vfsExists(path: string): boolean {
  if (files.has(path)) return true;
  // Check if any file lives under this path (directory check)
  const prefix = path.endsWith('/') ? path : path + '/';
  for (const key of files.keys()) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

export function vfsDelete(path: string): void {
  files.delete(path);
}

export function vfsDeleteDir(path: string): void {
  const prefix = path.endsWith('/') ? path : path + '/';
  for (const key of files.keys()) {
    if (key === path || key.startsWith(prefix)) {
      files.delete(key);
    }
  }
}

export function vfsListDir(path: string): string[] {
  const prefix = path.endsWith('/') ? path : path + '/';
  const entries = new Set<string>();
  for (const key of files.keys()) {
    if (key.startsWith(prefix)) {
      const rest = key.slice(prefix.length);
      const firstPart = rest.split('/')[0];
      if (firstPart) entries.add(firstPart);
    }
  }
  return [...entries];
}

export function vfsRename(from: string, to: string): void {
  // Move all files under `from` to `to`
  const fromPrefix = from.endsWith('/') ? from : from + '/';
  const toPrefix = to.endsWith('/') ? to : to + '/';
  const toMove: [string, string, string][] = [];
  for (const [key, value] of files.entries()) {
    if (key === from) {
      toMove.push([key, to, value]);
    } else if (key.startsWith(fromPrefix)) {
      toMove.push([key, toPrefix + key.slice(fromPrefix.length), value]);
    }
  }
  for (const [oldKey, newKey, value] of toMove) {
    files.delete(oldKey);
    files.set(newKey, value);
  }
}

export function seedVfs(entries: Record<string, string>): void {
  for (const [path, content] of Object.entries(entries)) {
    files.set(path, content);
  }
}

/** Debug: dump all VFS paths */
export function vfsDump(): string[] {
  return [...files.keys()].sort();
}
