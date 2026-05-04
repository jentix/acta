/**
 * Convert a title string into a URL/filename-safe kebab-case slug.
 * Steps: lower-case → collapse non-alphanumeric to dashes → trim dashes.
 */
export function titleToSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      // strip combining diacritics
      .replace(/[̀-ͯ]/g, "")
      // replace non-alphanumeric (and non-ascii) with dash
      .replace(/[^a-z0-9]+/g, "-")
      // collapse multiple dashes
      .replace(/-{2,}/g, "-")
      // trim leading/trailing dashes
      .replace(/^-+|-+$/g, "")
  );
}
