/**
 * Minimal, dependency-free PDF writer for demo documents (one or more text pages,
 * Helvetica). Produces valid PDF 1.4 with a correct xref table.
 */
const ASCII: Record<string, string> = { "—": "-", "–": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...", "•": "*", "·": "-", "×": "x", "½": "1/2", "¼": "1/4", "®": "(R)", "™": "(TM)", " ": " " };

function escapePdf(text: string): string {
  return text
    .replace(/[—–‘’“”…•·×½¼®™ ]/g, (c) => ASCII[c] ?? "?")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function wrap(text: string, max = 92): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      if ((line + " " + word).trim().length > max) {
        out.push(line.trim());
        line = word;
      } else line += ` ${word}`;
    }
    out.push(line.trim());
  }
  return out;
}

export function buildPdf(title: string, sections: Array<{ heading?: string; body: string }>): Uint8Array {
  const lines: Array<{ text: string; size: number; bold?: boolean }> = [...wrap(title, 52).map((t) => ({ text: t, size: 18, bold: true })), { text: "", size: 10 }];
  for (const s of sections) {
    if (s.heading) lines.push({ text: s.heading, size: 13, bold: true });
    for (const l of wrap(s.body)) lines.push({ text: l, size: 10 });
    lines.push({ text: "", size: 10 });
  }
  const perPage = 52;
  const pages: (typeof lines)[] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));

  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const catalog = add("");
  const pagesObj = add("");
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];
  for (const page of pages) {
    let y = 760;
    let stream = "BT\n";
    for (const l of page) {
      stream += `/${l.bold ? "F2" : "F1"} ${l.size} Tf 1 0 0 1 56 ${y} Tm (${escapePdf(l.text)}) Tj\n`;
      y -= l.size + 4;
    }
    stream += "ET\n";
    stream += `BT /F1 8 Tf 1 0 0 1 56 30 Tm (${escapePdf("CITI VIEW demo document - illustrative only, not an offer. Equal Housing Opportunity.")}) Tj ET\n`;
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
