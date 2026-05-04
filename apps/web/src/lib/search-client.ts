import {
  buildSearchUrl,
  getQueryFromUrl,
  searchDocuments,
  updateQueryInUrl,
  type WebSearchFilters,
  type WebSearchIndexArtifact,
} from "./search.js";

let searchIndexPromise: Promise<WebSearchIndexArtifact> | undefined;

export function initDocumentSearch(root: HTMLElement): void {
  const searchInput = root.querySelector<HTMLInputElement>("[data-search-query]");
  const kindSelect = root.querySelector<HTMLSelectElement>("[data-filter-kind]");
  const statusSelect = root.querySelector<HTMLSelectElement>("[data-filter-status]");
  const tagSelect = root.querySelector<HTMLSelectElement>("[data-filter-tag]");
  const componentSelect = root.querySelector<HTMLSelectElement>("[data-filter-component]");
  const sortInputs = Array.from(root.querySelectorAll<HTMLInputElement>("[data-sort-order]"));
  const documentList = root.querySelector<HTMLElement>("[data-document-list]");
  const showMoreButton = root.querySelector<HTMLButtonElement>("[data-show-more]");
  const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-document-row]"));
  const emptyState = root.querySelector<HTMLElement>("[data-empty-state]");
  const searchLink = root.querySelector<HTMLAnchorElement>("[data-search-link]");

  if (
    !searchInput ||
    !kindSelect ||
    !statusSelect ||
    !tagSelect ||
    !componentSelect ||
    sortInputs.length === 0 ||
    !documentList ||
    !showMoreButton ||
    !emptyState
  ) {
    throw new Error("Document search controls failed to initialize.");
  }

  const search = searchInput;
  const kindFilter = kindSelect;
  const statusFilter = statusSelect;
  const tagFilter = tagSelect;
  const componentFilter = componentSelect;
  const list = documentList;
  const showMore = showMoreButton;
  const empty = emptyState;
  const rowsById = new Map(rows.map((row) => [row.dataset.documentId ?? "", row]));
  const pageSize = Number.parseInt(list.dataset.pageSize ?? "20", 10);
  const increment = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20;
  let visibleLimit = increment;
  let currentMatchingCount = rows.length;
  let updateSequence = 0;

  search.value = getQueryFromUrl(window.location.href);

  function filters(): WebSearchFilters {
    return {
      kind: kindFilter.value,
      status: statusFilter.value,
      tag: tagFilter.value,
      component: componentFilter.value,
    };
  }

  function selectedSortOrder(): "newest" | "dependency" {
    return sortInputs.find((input) => input.checked)?.value === "dependency"
      ? "dependency"
      : "newest";
  }

  function syncQueryUrl() {
    const nextUrl = updateQueryInUrl(window.location.href, search.value);
    history.replaceState(history.state, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    if (searchLink) {
      searchLink.href = buildSearchUrl(search.value);
    }
  }

  async function matchingRows(): Promise<HTMLElement[]> {
    const query = search.value.trim();

    if (query.length > 0) {
      const ids = await searchDocuments(await loadSearchIndex(), query, filters());
      return ids.map((id) => rowsById.get(id)).filter((row) => row !== undefined);
    }

    const orderKey = selectedSortOrder() === "dependency" ? "dependencyOrder" : "newestOrder";
    return rows
      .filter((row) => rowMatchesFilters(row, filters()))
      .sort((left, right) => {
        const leftOrder = Number.parseInt(left.dataset[orderKey] ?? "0", 10);
        const rightOrder = Number.parseInt(right.dataset[orderKey] ?? "0", 10);
        return leftOrder - rightOrder;
      });
  }

  async function updateResults() {
    updateSequence += 1;
    const sequence = updateSequence;
    syncQueryUrl();
    const matches = await matchingRows();

    if (sequence !== updateSequence) {
      return;
    }

    for (const row of rows) {
      row.hidden = true;
    }

    matches.forEach((row, index) => {
      list.append(row);
      row.hidden = index >= visibleLimit;
    });

    list.append(empty);
    currentMatchingCount = matches.length;
    empty.hidden = matches.length > 0;
    showMore.hidden = matches.length <= visibleLimit;
  }

  const resetAndUpdateResults = () => {
    visibleLimit = increment;
    void updateResults();
  };

  for (const control of [
    search,
    kindFilter,
    statusFilter,
    tagFilter,
    componentFilter,
    ...sortInputs,
  ]) {
    control.addEventListener("input", resetAndUpdateResults);
    control.addEventListener("change", resetAndUpdateResults);
  }

  showMore.addEventListener("click", () => {
    visibleLimit = Math.min(visibleLimit + increment, currentMatchingCount);
    void updateResults();
  });

  void updateResults();
}

function rowMatchesFilters(row: HTMLElement, filters: WebSearchFilters): boolean {
  return (
    (!filters.kind || row.dataset.kind === filters.kind) &&
    (!filters.status || row.dataset.status === filters.status) &&
    (!filters.tag || (row.dataset.tags ?? "").split(" ").includes(filters.tag)) &&
    (!filters.component || (row.dataset.components ?? "").split(" ").includes(filters.component))
  );
}

async function loadSearchIndex(): Promise<WebSearchIndexArtifact> {
  searchIndexPromise ??= fetch("/search-index.json").then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load search index: ${response.status}`);
    }

    return response.json() as Promise<WebSearchIndexArtifact>;
  });

  return searchIndexPromise;
}
