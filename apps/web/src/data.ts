import type { AppData } from "./types";

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function loadAppData(): Promise<AppData> {
  const [documents, graph, searchIndex, siteMeta] = await Promise.all([
    readJson<AppData["documents"]>("/data/documents.json"),
    readJson<AppData["graph"]>("/data/graph.json"),
    readJson<AppData["searchIndex"]>("/data/search-index.json"),
    readJson<AppData["siteMeta"]>("/data/site-meta.json")
  ]);

  return { documents, graph, searchIndex, siteMeta };
}
