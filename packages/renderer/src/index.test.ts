import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./index.js";

describe("@acta/renderer", () => {
  it("renders common Markdown blocks to sanitized HTML", async () => {
    const result = await renderMarkdown(`# Title

Intro paragraph with [a link](https://example.com).

- First
- Second

| Name | Status |
| --- | --- |
| ADR | accepted |

\`\`\`ts
const value = "acta";
\`\`\`

<script>alert("xss")</script>`);

    expect(result.html).toContain("<h1>Title</h1>");
    expect(result.html).toContain('<a href="https://example.com">a link</a>');
    expect(result.html).toContain("<li>First</li>");
    expect(result.html).toContain("<table>");
    expect(result.html).toContain('<code class="language-ts">');
    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain("alert");
  });
});
