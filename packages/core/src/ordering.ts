import type { ActaDocument, InternalLinkKey } from "./schema.js";

export type OrderingLinkKey = Exclude<InternalLinkKey, "related">;
export type DependencyTieBreaker = "newest" | "oldest" | "id";

export interface OrderingGraphNode {
  id: string;
  kind: "adr" | "spec";
  status: string;
  title: string;
  date: string;
}

export interface OrderingGraphEdge {
  source: string;
  target: string;
  type: OrderingLinkKey;
}

export interface OrderingCycle {
  documentIds: string[];
}

export interface DocumentOrdering {
  nodes: OrderingGraphNode[];
  edges: OrderingGraphEdge[];
  documentIds: string[];
  layers: DependencyLayer[];
  cycles: OrderingCycle[];
}

export interface DependencyLayer {
  index: number;
  documentIds: string[];
}

export interface DependencySortOptions {
  tieBreaker?: DependencyTieBreaker;
}

const orderingLinkKeys = [
  "supersedes",
  "replacedBy",
  "decidedBy",
  "dependsOn",
  "validates",
] as const satisfies OrderingLinkKey[];

export function buildOrderingGraph(
  documents: ActaDocument[],
  options: DependencySortOptions = {},
): DocumentOrdering {
  const nodes = documents.map((document) => ({
    id: document.id,
    kind: document.kind,
    status: document.status,
    title: document.title,
    date: document.date,
  }));
  const edges = buildOrderingEdges(documents);
  const cycles = detectCycles(nodes.map((node) => node.id), edges);
  const documentIds = sortDocumentsByDependency(documents, options).map((document) => document.id);
  const layers = buildDependencyLayers(documents, options).layers;

  return {
    nodes,
    edges,
    documentIds,
    layers,
    cycles,
  };
}

export function sortDocumentsByDependency(
  documents: ActaDocument[],
  options: DependencySortOptions = {},
): ActaDocument[] {
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  return topologicalDocumentIds(documents, options).map((id) => documentsById.get(id) as ActaDocument);
}

export function buildDependencyLayers(
  documents: ActaDocument[],
  options: DependencySortOptions = {},
): Pick<DocumentOrdering, "layers" | "cycles"> {
  const sortedIds = topologicalDocumentIds(documents, options);
  const idSet = new Set(sortedIds);
  const edges = buildOrderingEdges(documents).filter(
    (edge) => idSet.has(edge.source) && idSet.has(edge.target),
  );
  const layerById = new Map(sortedIds.map((id) => [id, 0]));

  for (const id of sortedIds) {
    const currentLayer = layerById.get(id) ?? 0;
    for (const edge of edges.filter((candidate) => candidate.source === id)) {
      layerById.set(edge.target, Math.max(layerById.get(edge.target) ?? 0, currentLayer + 1));
    }
  }

  const layersByIndex = new Map<number, string[]>();
  for (const id of sortedIds) {
    const layer = layerById.get(id) ?? 0;
    layersByIndex.set(layer, [...(layersByIndex.get(layer) ?? []), id]);
  }

  return {
    layers: [...layersByIndex.entries()]
      .sort(([left], [right]) => left - right)
      .map(([index, documentIds]) => ({ index, documentIds })),
    cycles: detectCycles(sortedIds, edges),
  };
}

function buildOrderingEdges(documents: ActaDocument[]): OrderingGraphEdge[] {
  return documents.flatMap((document) =>
    orderingLinkKeys.flatMap((type) =>
      document.links[type].map((targetId) => {
        if (type === "replacedBy") {
          return {
            source: document.id,
            target: targetId,
            type,
          };
        }

        return {
          source: targetId,
          target: document.id,
          type,
        };
      }),
    ),
  );
}

function topologicalDocumentIds(
  documents: ActaDocument[],
  options: DependencySortOptions,
): string[] {
  const compare = createDocumentComparator(documents, options.tieBreaker ?? "newest");
  const documentIds = documents.map((document) => document.id);
  const documentIdSet = new Set(documentIds);
  const outgoing = new Map(documentIds.map((id) => [id, [] as string[]]));
  const indegree = new Map(documentIds.map((id) => [id, 0]));

  for (const edge of buildOrderingEdges(documents)) {
    if (!documentIdSet.has(edge.source) || !documentIdSet.has(edge.target)) {
      continue;
    }

    outgoing.get(edge.source)?.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  for (const targets of outgoing.values()) {
    targets.sort(compare);
  }

  const ready = documentIds.filter((id) => (indegree.get(id) ?? 0) === 0).sort(compare);
  const result: string[] = [];
  const emitted = new Set<string>();

  while (ready.length > 0) {
    const id = ready.shift() as string;
    if (emitted.has(id)) {
      continue;
    }

    result.push(id);
    emitted.add(id);

    for (const target of outgoing.get(id) ?? []) {
      indegree.set(target, (indegree.get(target) ?? 0) - 1);
      if ((indegree.get(target) ?? 0) === 0) {
        ready.push(target);
      }
    }

    ready.sort(compare);
  }

  const remaining = documentIds.filter((id) => !emitted.has(id)).sort(compare);
  return [...result, ...remaining];
}

function createDocumentComparator(
  documents: ActaDocument[],
  tieBreaker: DependencyTieBreaker,
): (leftId: string, rightId: string) => number {
  const documentsById = new Map(documents.map((document) => [document.id, document]));

  return (leftId, rightId) => {
    const left = documentsById.get(leftId);
    const right = documentsById.get(rightId);

    if (tieBreaker === "id") {
      return leftId.localeCompare(rightId);
    }

    const dateOrder =
      tieBreaker === "oldest"
        ? (left?.date ?? "").localeCompare(right?.date ?? "")
        : (right?.date ?? "").localeCompare(left?.date ?? "");

    return dateOrder === 0
      ? tieBreaker === "oldest"
        ? leftId.localeCompare(rightId)
        : rightId.localeCompare(leftId)
      : dateOrder;
  };
}

function detectCycles(documentIds: string[], edges: OrderingGraphEdge[]): OrderingCycle[] {
  const documentIdSet = new Set(documentIds);
  const outgoing = new Map(documentIds.map((id) => [id, [] as string[]]));

  for (const edge of edges) {
    if (documentIdSet.has(edge.source) && documentIdSet.has(edge.target)) {
      outgoing.get(edge.source)?.push(edge.target);
    }
  }

  const indexById = new Map<string, number>();
  const lowlinkById = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: OrderingCycle[] = [];
  let nextIndex = 0;

  function visit(id: string) {
    indexById.set(id, nextIndex);
    lowlinkById.set(id, nextIndex);
    nextIndex += 1;
    stack.push(id);
    onStack.add(id);

    for (const target of outgoing.get(id) ?? []) {
      if (!indexById.has(target)) {
        visit(target);
        lowlinkById.set(id, Math.min(lowlinkById.get(id) ?? 0, lowlinkById.get(target) ?? 0));
      } else if (onStack.has(target)) {
        lowlinkById.set(id, Math.min(lowlinkById.get(id) ?? 0, indexById.get(target) ?? 0));
      }
    }

    if (lowlinkById.get(id) !== indexById.get(id)) {
      return;
    }

    const component: string[] = [];
    let current: string | undefined;
    do {
      current = stack.pop();
      if (current) {
        onStack.delete(current);
        component.push(current);
      }
    } while (current && current !== id);

    if (component.length > 1 || hasSelfLoop(component[0], edges)) {
      cycles.push({ documentIds: component.sort((left, right) => left.localeCompare(right)) });
    }
  }

  for (const id of documentIds) {
    if (!indexById.has(id)) {
      visit(id);
    }
  }

  return cycles.sort((left, right) => left.documentIds[0].localeCompare(right.documentIds[0]));
}

function hasSelfLoop(id: string | undefined, edges: OrderingGraphEdge[]): boolean {
  return Boolean(id && edges.some((edge) => edge.source === id && edge.target === id));
}
