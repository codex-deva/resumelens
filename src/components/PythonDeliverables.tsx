import { useEffect, useState } from "react";
import { Check, Copy, Download, Terminal } from "lucide-react";
import type { DeliverablesPayload } from "../types/ats";

export function PythonDeliverables() {
  const [files, setFiles] = useState<DeliverablesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<"app.py" | "requirements.txt">("app.py");
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/deliverables")
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || "Failed to load Python deliverables.");
        }
        return res.json() as Promise<DeliverablesPayload>;
      })
      .then((data) => {
        if (mounted) setFiles(data);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load deliverables.");
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeContent =
    files == null ? "" : activeFile === "app.py" ? files.appPy : files.requirementsTxt;

  async function handleCopy() {
    if (!activeContent) return;
    await navigator.clipboard.writeText(activeContent);
    setCopiedFile(activeFile);
    window.setTimeout(() => setCopiedFile(null), 1800);
  }

  function handleDownload(fileName: "app.py" | "requirements.txt", content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-blue-700" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900">Run Locally with Streamlit</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Both <code className="font-mono text-xs text-slate-900">app.py</code> and{" "}
            <code className="font-mono text-xs text-slate-900">requirements.txt</code> are saved in
            your workspace root and ready for local execution.
          </p>

          <ol className="mt-5 space-y-4 border-t border-slate-100 pt-5 text-sm text-slate-700">
            <li>
              <span className="font-medium text-slate-900">1. Install dependencies</span>
              <pre className="mt-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800">
                pip install -r requirements.txt
              </pre>
            </li>
            <li>
              <span className="font-medium text-slate-900">2. Set API key (optional)</span>
              <pre className="mt-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800">
                export GEMINI_API_KEY=&quot;your-api-key&quot;
              </pre>
            </li>
            <li>
              <span className="font-medium text-slate-900">3. Launch Streamlit</span>
              <pre className="mt-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800">
                streamlit run app.py
              </pre>
            </li>
          </ol>

          {files && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => handleDownload("app.py", files.appPy)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download app.py
              </button>
              <button
                type="button"
                onClick={() => handleDownload("requirements.txt", files.requirementsTxt)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download requirements.txt
              </button>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-3">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeFile === "app.py"}
                onClick={() => setActiveFile("app.py")}
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeFile === "app.py"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                app.py
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeFile === "requirements.txt"}
                onClick={() => setActiveFile("requirements.txt")}
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeFile === "requirements.txt"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                requirements.txt
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!activeContent}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {copiedFile === activeFile ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy File
                </>
              )}
            </button>
          </div>

          {error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : !files ? (
            <div className="p-6 text-sm text-slate-500">Loading Python source files...</div>
          ) : (
            <pre className="max-h-[600px] overflow-auto bg-slate-950 p-5 font-mono text-xs leading-relaxed text-slate-100">
              <code>{activeContent}</code>
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}
