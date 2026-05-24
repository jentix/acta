import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type EdgeChange,
  MiniMap,
  type Node,
  type NodeChange,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import "@xyflow/react/dist/style.css";
import "./graph.css";

import type { DocumentGraph } from "@acta/core";
import type { FilterOptions } from "@lib/documents.js";
import { GraphContext } from "./GraphContext.js";
import { computeLayout } from "./layout.js";
import { nodeTypes } from "./nodes.js";

type GraphLabels = {
  filtersLegend: string;
  filterKind: string;
  filterStatus: string;
  all: string;
  areaLabel: string;
  legendLabel: string;
  legendDependency: string;
  legendRelated: string;
  legendSupersession: string;
};

type Props = {
  graph: DocumentGraph;
  filterOptions: FilterOptions;
  hrefForId: Record<string, string>;
  labels: GraphLabels;
};

export default function DocumentGraphIsland({ graph, filterOptions, hrefForId, labels }: Props) {
  const [kindFilter, setKindFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => computeLayout(graph), [graph]);

  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of graph.nodes) {
      const kindMatch = !kindFilter || node.kind === kindFilter;
      const statusMatch = !statusFilter || node.status === statusFilter;
      if (kindMatch && statusMatch) ids.add(node.id);
    }
    return ids;
  }, [graph.nodes, kindFilter, statusFilter]);

  // Stable nodes — does NOT depend on selectedId, so hover never rebuilds this
  const nodes: Node[] = useMemo(() => {
    return layoutNodes.map((node) => ({
      ...node,
      hidden: !visibleNodeIds.has(node.id),
      data: {
        ...node.data,
        href: hrefForId[node.id],
      },
    }));
  }, [layoutNodes, visibleNodeIds, hrefForId]);

  const connectedIds = useMemo((): Set<string> => {
    if (!selectedId) return new Set();
    const ids = new Set<string>([selectedId]);
    for (const edge of graph.edges) {
      if (edge.source === selectedId) ids.add(edge.target);
      if (edge.target === selectedId) ids.add(edge.source);
    }
    return ids;
  }, [selectedId, graph.edges]);

  // Edges update on selectedId change — acceptable since edges are cheap SVG paths
  const edges: Edge[] = useMemo(() => {
    return layoutEdges.map((edge) => {
      const sourceHidden = !visibleNodeIds.has(edge.source);
      const targetHidden = !visibleNodeIds.has(edge.target);
      const isActive =
        selectedId !== null && (edge.source === selectedId || edge.target === selectedId);
      const isDimmed = selectedId !== null && !isActive;
      const linkType = (edge.data as { linkType?: string })?.linkType ?? "";
      return {
        ...edge,
        hidden: sourceHidden || targetHidden,
        className: [
          `edge-${linkType}`,
          isActive ? "edge-highlighted" : "",
          isDimmed ? "edge-dimmed" : "",
        ]
          .filter(Boolean)
          .join(" "),
      };
    });
  }, [layoutEdges, visibleNodeIds, selectedId]);

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setSelectedId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
  }, []);

  const onNodesChange = useCallback((_: NodeChange[]) => {}, []);
  const onEdgesChange = useCallback((_: EdgeChange[]) => {}, []);

  const contextValue = useMemo(() => ({ selectedId, connectedIds }), [selectedId, connectedIds]);

  return (
    <GraphContext.Provider value={contextValue}>
      <div>
        <section className="graph-toolbar section-grid" aria-label={labels.filtersLegend}>
          <label className="ui-field">
            <span>{labels.filterKind}</span>
            <select
              className="ui-select"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
            >
              <option value="">{labels.all}</option>
              {filterOptions.kinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-field">
            <span>{labels.filterStatus}</span>
            <select
              className="ui-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{labels.all}</option>
              {filterOptions.statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="graph-shell" aria-label={labels.areaLabel}>
          <div className="graph-rf-wrapper">
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                onPaneClick={onPaneClick}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                minZoom={0.2}
                maxZoom={2.5}
                nodesDraggable={false}
                proOptions={{ hideAttribution: false }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                  color="var(--border)"
                />
                <Controls />
                <MiniMap
                  nodeColor={(node) =>
                    (node.data as { kind?: string }).kind === "adr"
                      ? "var(--accent)"
                      : "var(--muted)"
                  }
                  maskColor="color-mix(in srgb, var(--panel) 80%, transparent)"
                />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        </section>

        <section className="graph-legend" aria-label={labels.legendLabel}>
          <span>
            <i className="legend-line solid"></i>
            {labels.legendDependency}
          </span>
          <span>
            <i className="legend-line related"></i>
            {labels.legendRelated}
          </span>
          <span>
            <i className="legend-line supersession"></i>
            {labels.legendSupersession}
          </span>
          {filterOptions.kinds.map((kind) => (
            <span key={`kind-${kind}`}>
              <i className="legend-kind-bar" data-kind={kind}></i>
              {kind.toUpperCase()}
            </span>
          ))}
          {filterOptions.statuses.map((status) => (
            <span key={status}>
              <i className="legend-swatch" data-status={status}></i>
              {status}
            </span>
          ))}
        </section>
      </div>
    </GraphContext.Provider>
  );
}
