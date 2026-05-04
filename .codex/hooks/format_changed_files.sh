#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [ ! -f package.json ] || [ ! -f biome.json ]; then
  exit 0
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "codex hook: pnpm is not available; skipping changed-file formatting" >&2
  exit 0
fi

changed_files="$(mktemp)"
trap 'rm -f "$changed_files"' EXIT

if git rev-parse --verify HEAD >/dev/null 2>&1; then
  git diff --name-only --diff-filter=ACMR -z HEAD -- >"$changed_files"
else
  git ls-files --cached -z >"$changed_files"
fi

git ls-files --others --exclude-standard -z >>"$changed_files"

files=()
while IFS= read -r -d '' file; do
  [ -f "$file" ] || continue

  case "$file" in
    .codex/*)
      continue
      ;;
    *.js | *.jsx | *.ts | *.tsx | *.json | *.jsonc | *.css | *.md)
      files+=("$file")
      ;;
  esac
done <"$changed_files"

if [ "${#files[@]}" -eq 0 ]; then
  exit 0
fi

pnpm exec biome check --write --files-ignore-unknown=true --no-errors-on-unmatched "${files[@]}" >&2
