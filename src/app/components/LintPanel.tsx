"use client";

import { AlertTriangle, XCircle, Info, CheckCircle, Lightbulb } from "lucide-react";
import type { LintReport, LintSeverity } from "@/core/types";
import { useState } from "react";

interface LintPanelProps {
  report: LintReport | null;
}

const severityIcon: Record<LintSeverity, React.ReactNode> = {
  error: <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-400" />,
  info: <Info className="h-3.5 w-3.5 shrink-0 text-blue-400" />,
};

const severityLabel: Record<LintSeverity, string> = {
  error: "text-red-400",
  warning: "text-yellow-400",
  info: "text-blue-400",
};

export function LintPanel({ report }: LintPanelProps) {
  const [expandedFix, setExpandedFix] = useState<number | null>(null);

  if (!report) return null;

  const scoreColor =
    report.score >= 85
      ? "text-green-400"
      : report.score >= 70
        ? "text-yellow-400"
        : "text-red-400";

  const scoreBg =
    report.score >= 85
      ? "bg-green-400/10 border-green-400/20"
      : report.score >= 70
        ? "bg-yellow-400/10 border-yellow-400/20"
        : "bg-red-400/10 border-red-400/20";

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
        Lint
      </h3>

      {/* Score badge */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${scoreBg}`}
        >
          <span className={`text-2xl font-bold tabular-nums ${scoreColor}`}>
            {report.score}
          </span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
        <div className="flex items-center gap-1.5">
          {report.passed ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">Passed</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">Needs Work</span>
            </>
          )}
        </div>
      </div>

      {/* Results list */}
      {report.results.length > 0 && (
        <ul className="space-y-1.5">
          {report.results.map((r, i) => (
            <li key={i} className="group">
              <div className="flex items-start gap-2 text-xs">
                {severityIcon[r.severity]}
                <div className="min-w-0 flex-1">
                  <span
                    className={`font-medium ${severityLabel[r.severity]}`}
                  >
                    {r.ruleName}
                  </span>
                  <span className="ml-1.5 text-gray-400">{r.message}</span>
                  {r.fix && (
                    <button
                      onClick={() =>
                        setExpandedFix(expandedFix === i ? null : i)
                      }
                      className="ml-1.5 inline-flex items-center gap-0.5 text-indigo-400 hover:text-indigo-300"
                    >
                      <Lightbulb className="h-3 w-3" />
                      <span className="underline">fix</span>
                    </button>
                  )}
                  {r.fix && expandedFix === i && (
                    <div className="mt-1 rounded border border-indigo-500/20 bg-indigo-500/5 px-2 py-1 text-xs text-indigo-300">
                      {r.fix}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {report.results.length === 0 && (
        <p className="text-xs text-gray-600">No issues found.</p>
      )}
    </div>
  );
}

export default LintPanel;
