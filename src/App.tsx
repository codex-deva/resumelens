import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import { AlertTriangle, FileText, Loader2, Upload, X } from "lucide-react";
import { AnalysisReport } from "./components/AnalysisReport";
import { PythonDeliverables } from "./components/PythonDeliverables";
import type { AtsAnalysisResult } from "./types/ats";

type ActiveTab = "analyzer" | "deliverables";

const SAMPLE_JOB_DESCRIPTION = `Senior Full-Stack Software Engineer

We are seeking a Senior Full-Stack Engineer to design, build, and scale customer-facing web applications and backend APIs.

Requirements:
- 4+ years of production experience with TypeScript, React, and Node.js or Python (FastAPI/Django).
- Strong relational database skills (PostgreSQL, query optimization, schema migrations).
- Experience deploying containerized workloads on AWS or GCP using Docker and CI/CD pipelines.
- Track record of building REST or GraphQL APIs, automated test suites, and observable services.
- Clear written communication and experience mentoring engineers through code reviews.`;

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("analyzer");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<AtsAnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(file: File | undefined) {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setValidationWarning("Please select a valid PDF file (.pdf).");
      return;
    }
    setSelectedFile(file);
    setValidationWarning(null);
    setApiError(null);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFileSelected(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelected(event.dataTransfer.files?.[0]);
  }

  function handleClearFile() {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleResetSession() {
    handleClearFile();
    setJobDescription("");
    setValidationWarning(null);
    setApiError(null);
    setResult(null);
    setActiveTab("analyzer");
  }

  async function handleAnalyze() {
    setActiveTab("analyzer");

    if (!selectedFile && !jobDescription.trim()) {
      setValidationWarning(
        "Please upload a PDF resume and paste a target job description before analyzing."
      );
      return;
    }
    if (!selectedFile) {
      setValidationWarning("Please upload your resume in PDF format.");
      return;
    }
    if (!jobDescription.trim()) {
      setValidationWarning("Please paste the target job description.");
      return;
    }

    setValidationWarning(null);
    setApiError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("resume", selectedFile);
      formData.append("jobDescription", jobDescription.trim());

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as AtsAnalysisResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Analysis request failed.");
      }

      setResult(payload);
    } catch (err) {
      setResult(null);
      setApiError(
        err instanceof Error ? err.message : "An unexpected error occurred during analysis."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const jdWordCount = jobDescription.trim()
    ? jobDescription.trim().split(/\s+/).length
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Three-zone Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("analyzer");
            }}
            className="text-base font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
          >
            ATS Resume Studio
          </a>

          <nav aria-label="Primary" className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("analyzer")}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "analyzer"
                  ? "border-blue-700 text-slate-950"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Resume Analyzer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deliverables")}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "deliverables"
                  ? "border-blue-700 text-slate-950"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Python &amp; Streamlit Code
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleResetSession}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              New Analysis
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1280px] px-6 py-8">
        {/* Page Title & 1-Line Subtitle */}
        <div className="mb-8 max-w-3xl space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl [text-wrap:balance]">
            AI Resume Analyzer &amp; ATS Score Checker
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
            Upload a PDF resume and paste a target job description to evaluate ATS alignment,
            matching skills, missing keywords, and five tailored improvements.
          </p>
        </div>

        {activeTab === "deliverables" ? (
          <PythonDeliverables />
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-12">
            {/* Left Column: Inputs */}
            <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
              {/* Step 1: PDF Resume Uploader */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="resume-upload"
                    className="text-sm font-semibold text-slate-900"
                  >
                    1. Upload Resume (PDF)
                  </label>
                  <span className="text-xs text-slate-500">PDF only · Max 10 MB</span>
                </div>

                {selectedFile ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText
                        className="h-5 w-5 shrink-0 text-blue-700"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {selectedFile.name}
                        </p>
                        <p className="font-mono text-xs text-slate-500 tabular-nums">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      aria-label="Remove selected PDF"
                      className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 shrink-0"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-7 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                      isDragging
                        ? "border-blue-700 bg-blue-50/50"
                        : "border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <Upload className="h-5 w-5 text-slate-500" aria-hidden="true" />
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      Click to choose a PDF or drag and drop
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Text-based PDF resumes are parsed automatically
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  id="resume-upload"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleInputChange}
                  className="sr-only"
                />
              </div>

              {/* Step 2: Job Description Input */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="job-description"
                    className="text-sm font-semibold text-slate-900"
                  >
                    2. Target Job Description
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setJobDescription(SAMPLE_JOB_DESCRIPTION);
                      setValidationWarning(null);
                    }}
                    className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline whitespace-nowrap shrink-0"
                  >
                    Insert sample JD
                  </button>
                </div>

                <textarea
                  id="job-description"
                  rows={10}
                  value={jobDescription}
                  onChange={(e) => {
                    setJobDescription(e.target.value);
                    if (validationWarning) setValidationWarning(null);
                  }}
                  placeholder="Paste the full job description here, including responsibilities, required technical skills, tools, and preferred qualifications..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Include required skills and responsibilities for best accuracy</span>
                  <span className="font-mono tabular-nums">{jdWordCount} words</span>
                </div>
              </div>

              {/* Validation Warning */}
              {validationWarning && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900"
                >
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                    aria-hidden="true"
                  />
                  <span>{validationWarning}</span>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Analyzing Resume...
                  </>
                ) : (
                  "Analyze Resume"
                )}
              </button>
            </section>

            {/* Right Column: ATS Report */}
            <div className="lg:col-span-7">
              <AnalysisReport result={result} isLoading={isLoading} error={apiError} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
