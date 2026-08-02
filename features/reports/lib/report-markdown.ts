/**
 * Tiny, dependency-free markdown → HTML renderer for AI-generated reports.
 *
 * This is a deliberate minimal subset (headings, emphasis, code, tables,
 * lists, paragraphs) — the AI is instructed to write in that subset, and a
 * full markdown library would add XSS surface for no benefit. Input is
 * escaped before any regex runs, so model output can never inject markup.
 *
 * Fenced code blocks are dropped outright: reports are for findings, not
 * code, and models occasionally slip chart code into the output anyway.
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** A header row, a dashed separator row, then one or more body rows. */
const TABLE_BLOCK = /^\|(.+)\|[ \t]*\n\|[ \t:|-]+\|[ \t]*\n((?:\|.*\|[ \t]*\n?)+)/gm;

function renderTable(_match: string, header: string, body: string): string {
  const cells = (row: string) =>
    row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

  const head = cells(header).map((c) => `<th>${c}</th>`).join("");
  const rows = body
    .trimEnd()
    .split("\n")
    .filter((r) => r.trim())
    .map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

/** Drop fenced code blocks (```…```) so chart code can never reach the reader. */
function stripCodeBlocks(md: string): string {
  return md.replace(/```[\w]*\n[\s\S]*?```/g, "");
}

export function markdownToHtml(md: string): string {
  return escapeHtml(stripCodeBlocks(md))
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(TABLE_BLOCK, renderTable)
    .replace(/^[*-] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hupltc])(.+)$/gm, "<p>$1</p>");
}
