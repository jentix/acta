import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams
} from "react-router-dom";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { loadAppData } from "./data";
import { filterDocuments, sortDocuments } from "./lib";
import type { AppData, BuiltDocumentArtifact } from "./types";

interface AppShellProps {
  initialData?: AppData;
}

export function AppShell({ initialData }: AppShellProps) {
  const [data, setData] = useState<AppData | null>(initialData ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      return;
    }
    loadAppData().then(setData).catch((cause: Error) => setError(cause.message));
  }, [initialData]);

  if (error) {
    return <div className="app-shell"><p>Failed to load data: {error}</p></div>;
  }

  if (!data) {
    return <div className="app-shell"><p>Loading ADR Book artifacts…</p></div>;
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Docs as code viewer</p>
            <h1>{data.siteMeta.title}</h1>
          </div>
          <nav className="topnav">
            <NavLink to="/">Overview</NavLink>
            <NavLink to="/documents">Documents</NavLink>
            <NavLink to="/graph">Graph</NavLink>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<OverviewPage data={data} />} />
          <Route path="/documents" element={<DocumentsPage data={data} />} />
          <Route path="/documents/:id" element={<DocumentPage data={data} />} />
          <Route path="/graph" element={<GraphPage data={data} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export function OverviewPage({ data }: { data: AppData }) {
  const recent = sortDocuments(data.documents).slice(0, 5);
  return (
    <main className="page overview-grid">
      <section className="hero-card">
        <p className="eyebrow">Repository knowledge base</p>
        <h2>{data.siteMeta.totalDocuments} documents indexed</h2>
        <p>
          Read architecture decisions and living specs from generated artifacts with
          validation warnings and typed links.
        </p>
      </section>
      <section className="stats-grid">
        <StatCard label="ADRs" value={data.siteMeta.countsByKind.adr} />
        <StatCard label="Specs" value={data.siteMeta.countsByKind.spec} />
        <StatCard label="Tags" value={data.siteMeta.tags.length} />
        <StatCard label="Components" value={data.siteMeta.components.length} />
      </section>
      <section className="panel">
        <div className="panel-header">
          <h3>Recent documents</h3>
          <Link to="/documents">Open list</Link>
        </div>
        <ul className="document-list">
          {recent.map((document) => (
            <li key={document.id}>
              <Link to={`/documents/${document.id}`}>{document.id}</Link>
              <span>{document.title}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h3>Status overview</h3>
        </div>
        <ul className="status-list">
          {Object.entries(data.siteMeta.countsByStatus).map(([status, count]) => (
            <li key={status}>
              <span>{status}</span>
              <strong>{count}</strong>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function DocumentsPage({ data }: { data: AppData }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [tag, setTag] = useState("all");

  const filtered = useMemo(
    () =>
      sortDocuments(
        filterDocuments(data.documents, {
          query,
          kind,
          status,
          tag
        })
      ),
    [data.documents, kind, query, status, tag]
  );

  return (
    <main className="page">
      <section className="panel filters">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by id, title, tag or body text"
        />
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="all">All kinds</option>
          <option value="adr">ADR</option>
          <option value="spec">Spec</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          {Object.keys(data.siteMeta.countsByStatus).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select value={tag} onChange={(event) => setTag(event.target.value)}>
          <option value="all">All tags</option>
          {data.siteMeta.tags.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Documents</h2>
          <span>{filtered.length} shown</span>
        </div>
        <ul className="document-cards">
          {filtered.map((document) => (
            <li key={document.id}>
              <DocumentSummaryCard document={document} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function DocumentSummaryCard({ document }: { document: BuiltDocumentArtifact }) {
  return (
    <article className="document-card">
      <div className="document-card-top">
        <Link to={`/documents/${document.id}`}>{document.id}</Link>
        <span className={`badge badge-${document.kind}`}>{document.kind}</span>
        <span className="badge">{document.status}</span>
      </div>
      <h3>{document.title}</h3>
      <p>{document.summary ?? "No summary provided."}</p>
      <div className="chip-row">
        {document.tags.map((tag) => (
          <span key={tag} className="chip">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

export function DocumentPage({ data }: { data: AppData }) {
  const { id } = useParams();
  const document = data.documents.find((entry) => entry.id === id);

  if (!document) {
    return (
      <main className="page">
        <section className="panel">
          <h2>Document not found</h2>
        </section>
      </main>
    );
  }

  return (
    <main className="page detail-grid">
      <section className="panel detail-main">
        <div className="document-card-top">
          <span className="doc-id">{document.id}</span>
          <span className={`badge badge-${document.kind}`}>{document.kind}</span>
          <span className="badge">{document.status}</span>
        </div>
        <h2>{document.title}</h2>
        <p className="meta-line">
          {document.date} · owners: {document.owners.join(", ") || "Unassigned"} · component:{" "}
          {document.component.join(", ") || "-"}
        </p>
        <p>{document.summary ?? "No summary provided."}</p>
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: document.html }} />
      </section>
      <aside className="detail-sidebar">
        <section className="panel">
          <h3>Outgoing links</h3>
          <LinkGroups document={document} />
        </section>
        <section className="panel">
          <h3>Backlinks</h3>
          <ul className="simple-list">
            {document.backlinks.length > 0 ? (
              document.backlinks.map((edge) => (
                <li key={`${edge.from}-${edge.type}`}>
                  <Link to={`/documents/${edge.from}`}>{edge.from}</Link> <span>{edge.type}</span>
                </li>
              ))
            ) : (
              <li>No backlinks.</li>
            )}
          </ul>
        </section>
        <section className="panel">
          <h3>Validation</h3>
          <ul className="simple-list">
            {document.issues.length > 0 ? (
              document.issues.map((issue) => (
                <li key={`${issue.code}-${issue.message}`}>
                  <strong>{issue.level}</strong> {issue.message}
                </li>
              ))
            ) : (
              <li>No issues.</li>
            )}
          </ul>
        </section>
      </aside>
    </main>
  );
}

function LinkGroups({ document }: { document: BuiltDocumentArtifact }) {
  return (
    <div className="link-groups">
      {Object.entries(document.links).map(([type, values]) => (
        <div key={type}>
          <strong>{type}</strong>
          <ul className="simple-list">
            {values.length > 0 ? (
              values.map((value) => (
                <li key={value}>
                  {type === "references" ? (
                    <a href={value} target="_blank" rel="noreferrer">
                      {value}
                    </a>
                  ) : (
                    <Link to={`/documents/${value}`}>{value}</Link>
                  )}
                </li>
              ))
            ) : (
              <li>-</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function GraphPage({ data }: { data: AppData }) {
  const navigate = useNavigate();
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [tag, setTag] = useState("all");

  const visibleNodes = useMemo(() => {
    return data.graph.nodes.filter((node) => {
      const kindMatch = kind === "all" || node.kind === kind;
      const statusMatch = status === "all" || node.status === status;
      const tagMatch = tag === "all" || node.tags.includes(tag);
      return kindMatch && statusMatch && tagMatch;
    });
  }, [data.graph.nodes, kind, status, tag]);

  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const nodes: Node[] = visibleNodes.map((node, index) => ({
    id: node.id,
    data: {
      label: `${node.id}\n${node.title}`
    },
    position: {
      x: 80 + (index % 4) * 260,
      y: 80 + Math.floor(index / 4) * 160
    },
    style: {
      borderRadius: 16,
      padding: 12,
      width: 210,
      border: `2px solid ${node.kind === "adr" ? "#9c4221" : "#0f766e"}`,
      background: "#fffdf7",
      whiteSpace: "pre-line"
    }
  }));

  const edges: Edge[] = data.graph.edges
    .filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to))
    .map((edge) => ({
      id: `${edge.from}-${edge.type}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      label: edge.type
    }));

  return (
    <main className="page">
      <section className="panel filters">
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="all">All kinds</option>
          <option value="adr">ADR</option>
          <option value="spec">Spec</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          {Object.keys(data.siteMeta.countsByStatus).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select value={tag} onChange={(event) => setTag(event.target.value)}>
          <option value="all">All tags</option>
          {data.siteMeta.tags.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </section>
      <section className="graph-panel">
        <ReactFlow
          fitView
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => navigate(`/documents/${node.id}`)}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </section>
    </main>
  );
}
