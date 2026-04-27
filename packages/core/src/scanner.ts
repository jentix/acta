import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface ScannedMarkdownFile {
  path: string;
  content: string;
}

export async function scanMarkdownFiles(directories: string[]): Promise<ScannedMarkdownFile[]> {
  const files = (await Promise.all(directories.map((directory) => scanDirectory(directory))))
    .flat()
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    files.map(async (path) => ({
      path,
      content: await readFile(path, "utf8"),
    })),
  );
}

async function scanDirectory(directory: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isMissingDirectory(error)) {
      return [];
    }
    throw error;
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return scanDirectory(path);
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [path];
      }
      return [];
    }),
  );

  return nested.flat();
}

function isMissingDirectory(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
