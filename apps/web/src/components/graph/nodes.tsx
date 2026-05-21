import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import React from "react";
import { useGraphContext } from "./GraphContext.js";

type GraphNodeData = {
  label: string;
  status: string;
  kind: "adr" | "spec";
  tags: string[];
  href?: string;
};

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function GraphNodeCard({
  id,
  data,
  kind,
}: {
  id: string;
  data: GraphNodeData;
  kind: "adr" | "spec";
}) {
  const { selectedId, connectedIds } = useGraphContext();

  const dimmed = selectedId !== null && !connectedIds.has(id);
  const highlighted = selectedId !== null && connectedIds.has(id);

  const href = data.href;

  const inner = (
    <div
      className={[
        "graph-rf-node",
        `graph-rf-node--${kind}`,
        dimmed ? "graph-rf-node--dimmed" : "",
        highlighted ? "graph-rf-node--highlighted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <span className="graph-rf-node__id">{id}</span>
      <span className="graph-rf-node__title">{truncate(data.label, 30)}</span>
      <span
        className={`graph-rf-node__status graph-rf-node__status--${data.status
          .toLowerCase()
          .replace(/\s+/g, "-")}`}
      >
        {data.status}
      </span>
    </div>
  );

  return href ? (
    <a href={href} className="graph-rf-node-link" title={data.label}>
      {inner}
    </a>
  ) : (
    inner
  );
}

export function AdrNode(props: NodeProps) {
  return <GraphNodeCard id={props.id} kind="adr" data={props.data as GraphNodeData} />;
}

export function SpecNode(props: NodeProps) {
  return <GraphNodeCard id={props.id} kind="spec" data={props.data as GraphNodeData} />;
}

export const nodeTypes = {
  adr: AdrNode,
  spec: SpecNode,
};
