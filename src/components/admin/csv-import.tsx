"use client";

import { useRef, useState } from "react";
import Link from "@/components/app-link";
import Papa from "papaparse";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api, apiError } from "@/lib/api-client";
import { formatPrice } from "@/lib/format";
import { IMPORT_COLUMNS, ImportRowSchema } from "@/lib/validation/admin";

const MAX_ROWS = 2_000;
const CHUNK = 100;
const REQUIRED = ["street_address", "city", "state", "zip", "price", "description"];
const EXAMPLE: Record<string, string> = {
  street_address: "123 Example Street",
  unit: "",
  city: "Austin",
  state: "TX",
  zip: "78704",
  category: "RESIDENTIAL",
  transaction_type: "SALE",
  property_type: "SINGLE_FAMILY",
  price: "549000",
  beds: "3",
  baths: "2",
  sqft: "1650",
  lot_sqft: "6500",
  year_built: "1998",
  headline: "Updated kitchen and a shaded backyard",
  description: "Single-story home with an open living area, updated kitchen, two-car garage and a large shaded backyard.",
  mls_number: "",
};

interface Row {
  line: number;
  data: Record<string, string>;
  error?: string;
}
type RowError = { line: number; message: string };

export function CsvImport() {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{ created: number; errors: RowError[] } | null>(null);

  const valid = rows.filter((r) => !r.error);

  const template = () => {
    const csv = Papa.unparse({ fields: IMPORT_COLUMNS, data: [IMPORT_COLUMNS.map((c) => EXAMPLE[c] ?? "")] });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "citiview-listings-template.csv" });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const reset = () => {
    setRows([]);
    setResult(null);
    setProblem(null);
    setUnknown([]);
  };

  const onFile = (file: File | undefined) => {
    reset();
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setProblem("That file is over 5 MB. Split it into smaller files.");
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"),
      complete: (out) => {
        const fields = out.meta.fields ?? [];
        const missing = REQUIRED.filter((c) => !fields.includes(c));
        if (missing.length) return setProblem(`Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Download the template to see the expected headers.`);
        if (out.data.length > MAX_ROWS) return setProblem(`Up to ${MAX_ROWS.toLocaleString("en-US")} rows per file. This one has ${out.data.length.toLocaleString("en-US")}.`);
        setUnknown(fields.filter((f) => !IMPORT_COLUMNS.includes(f)));
        setRows(
          out.data.map((data, i) => {
            const clean = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, String(data[c] ?? "").slice(0, 12_000)]));
            const parsed = ImportRowSchema.safeParse(clean);
            const issue = parsed.success ? null : parsed.error.issues[0]!;
            return { line: i + 2, data: clean, error: issue ? `${issue.path.join(".")}: ${issue.message}` : undefined };
          }),
        );
      },
      error: (err) => setProblem(`Could not read that file: ${err.message}`),
    });
  };

  const run = async () => {
    setProgress(0);
    const all = { created: 0, errors: [] as RowError[] };
    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK).map(({ line, data }) => ({ line, data }));
      const res = await api<{ created: unknown[]; errors: RowError[] }>("/api/admin/import", { method: "POST", json: { rows: chunk } });
      if (!res.ok) {
        all.errors.push(...chunk.map((r) => ({ line: r.line, message: apiError(res) })));
      } else {
        all.created += res.data.created.length;
        all.errors.push(...res.data.errors);
      }
      setProgress(Math.round(((i + chunk.length) / valid.length) * 100));
    }
    setResult(all);
    setProgress(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border bg-card p-5">
        <FileSpreadsheet className="size-8 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <label htmlFor="csv-file" className="block font-semibold">Choose a CSV file</label>
          <p className="text-sm text-muted-foreground">UTF-8, one listing per row, up to {MAX_ROWS.toLocaleString("en-US")} rows. Rows are checked here and again on the server.</p>
        </div>
        <input
          ref={input}
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          className="max-w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button type="button" variant="outline" size="sm" onClick={template}><Download className="size-4" aria-hidden /> Template</Button>
      </div>

      {problem && <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{problem}</p>}
      {unknown.length > 0 && <p className="text-sm text-muted-foreground">Ignored column{unknown.length === 1 ? "" : "s"}: {unknown.join(", ")}</p>}

      {rows.length > 0 && !result && (
        <section aria-labelledby="preview-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="preview-title" className="font-semibold">{fileName}: {valid.length} of {rows.length} rows ready</h2>
            <Button onClick={run} disabled={!valid.length || progress !== null}>
              {progress !== null && <Loader2 className="size-4 animate-spin" aria-hidden />} Import {valid.length} as drafts
            </Button>
          </div>
          {progress !== null && <Progress value={progress} aria-label="Import progress" className="mb-3" />}
          <div className="max-h-[28rem] overflow-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Rows found in the CSV and whether each one is valid</caption>
              <thead className="sticky top-0 bg-muted text-xs uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2">Line</th>
                  <th scope="col" className="px-3 py-2">Address</th>
                  <th scope="col" className="px-3 py-2">Price</th>
                  <th scope="col" className="px-3 py-2">Check</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 500).map((r) => (
                  <tr key={r.line}>
                    <td className="px-3 py-2 tabular-nums">{r.line}</td>
                    <td className="px-3 py-2">{r.data.street_address}{r.data.unit ? ` #${r.data.unit}` : ""}, {r.data.city}, {r.data.state} {r.data.zip}</td>
                    <td className="px-3 py-2 tabular-nums">{Number(r.data.price) ? formatPrice(Number(r.data.price)) : r.data.price}</td>
                    <td className="px-3 py-2">
                      {r.error ? (
                        <span className="flex items-center gap-1.5 text-destructive"><XCircle className="size-4 shrink-0" aria-hidden /> {r.error}</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-4 shrink-0" aria-hidden /> Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 500 && <p className="mt-2 text-xs text-muted-foreground">Showing the first 500 rows.</p>}
        </section>
      )}

      {result && (
        <section aria-labelledby="result-title" role="status" className="rounded-3xl border bg-card p-5">
          <h2 id="result-title" className="font-semibold">Imported {result.created} draft listing{result.created === 1 ? "" : "s"}</h2>
          {result.errors.length > 0 && (
            <>
              <p className="mt-1 text-sm text-muted-foreground">{result.errors.length} row{result.errors.length === 1 ? " was" : "s were"} skipped:</p>
              <ul className="mt-2 max-h-60 space-y-1 overflow-auto text-sm">
                {result.errors.map((e) => <li key={`${e.line}-${e.message}`}><span className="tabular-nums">Line {e.line}</span>: {e.message}</li>)}
              </ul>
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild><Link href="/admin/listings?status=DRAFT&source=ADMIN">Review drafts</Link></Button>
            <Button
              variant="outline"
              onClick={() => {
                reset();
                setFileName("");
                if (input.current) input.current.value = "";
              }}
            >
              Import another file
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
