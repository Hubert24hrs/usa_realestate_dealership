import "server-only";
import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { slugify } from "./format";

export interface TocItem {
  id: string;
  text: string;
}

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "a", "blockquote", "code", "pre", "table", "thead", "tbody", "tr", "th", "td", "hr", "br"],
  allowedAttributes: { a: ["href", "title", "rel", "target"], h2: ["id"], h3: ["id"], h4: ["id"], th: ["scope"] },
  allowedSchemes: ["https", "http", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  transformTags: {
    // Pages own the single <h1>; content headings start at h2.
    h1: "h2",
    a: (tagName, attribs) => {
      const external = /^https?:\/\//i.test(attribs.href ?? "");
      return { tagName, attribs: external ? { ...attribs, rel: "noopener noreferrer nofollow", target: "_blank" } : attribs };
    },
  },
};

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/**
 * Markdown → sanitized HTML with stable heading ids, plus a table of contents of the h2s.
 * Content may come from the CMS, so the output is always run through an allowlist.
 */
export function renderMarkdown(source: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const text = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
        let id = slugify(text) || "section";
        const seen = used.get(id) ?? 0;
        used.set(id, seen + 1);
        if (seen) id = `${id}-${seen + 1}`;
        const level = Math.min(4, Math.max(2, depth));
        if (level === 2) toc.push({ id, text });
        return `<h${level} id="${id}">${inner}</h${level}>\n`;
      },
    },
  });
  const raw = marked.parse(source, { async: false }) as string;
  return { html: sanitizeHtml(raw, SANITIZE), toc };
}

/** Plain-text excerpt of markdown (for meta descriptions). */
export function markdownToText(source: string, max = 160): string {
  const text = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
