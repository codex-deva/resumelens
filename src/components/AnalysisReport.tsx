import { AlertCircle, Check, FileSearch, Minus, Sparkles } from "lucide-react";
import type { AtsAnalysisResult } from "../types/ats";

interface AnalysisReportProps {
  result: AtsAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

function getScoreClassification(score: number): {
  label: string;
  barClass: string;
  textClass: string;
} {
  if (score >= 80) {
    return {
      label: "Strong Match",
      barClass: "bg-emerald-600",
      textClass: "text-emerald-700",
    };
  }
  if (score >= 60) {
    return {
      label: "Moderate Match",
      barClass: "bg-amber-600",
      textClass: "text-amber-700",
    };
  }
  return {
    label: "Needs Optimization",
    barClass: "bg-red-600",
    textClass: "text-red-700",
  };
}

export function AnalysisReport({ result, isLoading, error }: AnalysisReportProps) {
  if (error) {
    return (
      <section
        aria-live="polite"
        className="rounded-xl border border-red-200 bg-white p-6"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">Unable to Complete Analysis</h2>
            <p className="text-sm leading-relaxed text-slate-700">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="Analyzing resume"
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="space-y-3 border-b border-slate-100 pb-6">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="flex items-baseline justify-between">
            <div className="h-10 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-2.5 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="grid gap-6 border-b border-slate-100 pb-6 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-slate-100" />
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8">
        <div className="max-w-lg space-y-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
            <FileSearch className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-slate-900">ATS Evaluation Report</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Upload your PDF resume and paste the target job description on the left, then click
              Analyze Resume to generate your structured report.
            </p>
          </div>
          <dl className="grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-900">01. ATS Match Score</dt>
              <dd className="mt-0.5 text-slate-500">
                Calibrated 0–100 score with alignment band and summary.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">02. Matching Skills</dt>
              <dd className="mt-0.5 text-slate-500">
                Verified skills and qualifications present in both documents.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">03. Missing Keywords</dt>
              <dd className="mt-0.5 text-slate-500">
                High-priority tools, frameworks, and terms missing from your resume.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">04. 5 Actionable Suggestions</dt>
              <dd className="mt-0.5 text-slate-500">
                Five targeted improvements tailored specifically to this role.
              </dd>
            </div>
          </dl>
        </div>
      </section>
    );
  }

  const classification = getScoreClassification(result.atsScore);

  return (
    <section aria-live="polite" className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {/* Section 1: ATS Match Score */}
      <div className="p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">ATS Match Score</h2>
          {result.meta && (
            <p className="font-mono text-xs text-slate-500 tabular-nums">
              {result.meta.fileName}
              <span aria-hidden="true"> · </span>
              {result.meta.totalPages} {result.meta.totalPages === 1 ? "page" : "pages"}
              <span aria-hidden="true"> · </span>
              {result.meta.extractedChars.toLocaleString()} chars
            </p>
          )}
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl font-semibold tracking-tight text-slate-950 tabular-nums">
              {result.atsScore}
            </span>
            <span className="font-mono text-base text-slate-400 tabular-nums">/ 100</span>
          </div>
          <span className={`text-sm font-semibold ${classification.textClass}`}>
            {classification.label}
          </span>
        </div>

        <div
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={result.atsScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="ATS Match Score"
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${classification.barClass}`}
            style={{ width: `${result.atsScore}%` }}
          />
        </div>

        {result.scoreSummary && (
          <p className="mt-4 text-sm leading-relaxed text-slate-600">{result.scoreSummary}</p>
        )}
      </div>

      {/* Section 2 & 3: Matching Skills + Missing Skills & Keywords */}
      <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Matching Skills</h3>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {result.matchingSkills.length} found
            </span>
          </div>
          {result.matchingSkills.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {result.matchingSkills.map((skill, idx) => (
                <li key={`${skill}-${idx}`} className="flex items-start gap-2.5 py-2 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{skill}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No direct skill overlap was identified against this job description.
            </p>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Missing Skills &amp; Keywords</h3>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {result.missingSkillsAndKeywords.length} gaps
            </span>
          </div>
          {result.missingSkillsAndKeywords.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {result.missingSkillsAndKeywords.map((keyword, idx) => (
                <li key={`${keyword}-${idx}`} className="flex items-start gap-2.5 py-2 text-sm text-slate-700">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                  <span>{keyword}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-emerald-700">
              All core keywords from the job description appear covered in your resume.
            </p>
          )}
        </div>
      </div>

      {/* Section 4: 5 Actionable Suggestions */}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-700" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">5 Actionable Suggestions</h3>
        </div>
        <ol className="mt-4 divide-y divide-slate-100">
          {result.actionableSuggestions.map((suggestion, idx) => (
            <li key={idx} className="flex items-start gap-4 py-3 text-sm leading-relaxed text-slate-700">
              <span className="font-mono text-xs font-semibold text-blue-700 tabular-nums pt-0.5">
                0{idx + 1}.
              </span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
