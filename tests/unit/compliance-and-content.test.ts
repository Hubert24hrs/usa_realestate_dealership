import { describe, expect, it } from "vitest";
import { checkFairHousing, hasBlockingFinding } from "@/lib/fair-housing";
import { markdownToText, renderMarkdown } from "@/lib/markdown";

describe("Fair Housing language check", () => {
  it.each([
    "Lovely 2-bed, adults only.",
    "No kids please, quiet building",
    "Christian family preferred",
    "Not suitable for wheelchairs",
    "Whites only neighborhood",
  ])("blocks %j", (text) => {
    expect(hasBlockingFinding(text)).toBe(true);
  });

  it("warns, without blocking, on softer preference language", () => {
    const findings = checkFairHousing("Perfect for young professionals in a safe neighborhood. No Section 8.");
    expect(findings.length).toBeGreaterThanOrEqual(3);
    expect(findings.every((f) => f.severity === "warn")).toBe(true);
  });

  it("accepts property-focused copy and qualifying 55+ wording", () => {
    expect(checkFairHousing("Bright corner unit with a home office nook, two blocks from the park. Wheelchair-accessible entrance.")).toEqual([]);
    expect(hasBlockingFinding("Single-level home in a 55+ community with a clubhouse.")).toBe(false);
  });
});

describe("renderMarkdown", () => {
  it("strips scripts, event handlers and dangerous URLs", () => {
    const { html } = renderMarkdown('## Hi\n\n<script>alert(1)</script><img src=x onerror="alert(1)">\n\n[bad](javascript:alert(1)) [ok](https://example.com)');
    expect(html).not.toMatch(/<script|onerror|javascript:/i);
    expect(html).toContain('href="https://example.com"');
  });

  it("marks external links and builds a table of contents with stable ids", () => {
    const { html, toc } = renderMarkdown("# Title\n\n## Getting started\n\ntext\n\n## Getting started\n\n[site](https://example.com)");
    expect(html).not.toContain("<h1"); // pages own the h1, so a Markdown h1 is demoted to h2 (and listed)
    expect(toc.map((t) => t.id)).toEqual(["title", "getting-started", "getting-started-2"]);
    expect(html).toMatch(/rel="noopener noreferrer nofollow"/);
  });

  it("produces a plain-text excerpt", () => {
    const text = markdownToText("## Heading\n\nSome **bold** text with a [link](https://example.com).");
    expect(text).not.toMatch(/[#*[\]]/);
    expect(text).toContain("Some bold text");
  });
});
