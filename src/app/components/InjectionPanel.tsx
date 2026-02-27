"use client";

import { Check, Minus } from "lucide-react";
import type { InjectionReport } from "@/core/types";

interface InjectionPanelProps {
  report: InjectionReport | null;
}

export function InjectionPanel({ report }: InjectionPanelProps) {
  if (!report) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
        Injections
      </h3>

      {/* Summary stats */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
        <span>
          <span className="font-medium text-emerald-400">
            {report.blocksIncluded}
          </span>{" "}
          included
        </span>
        {report.blocksOmitted > 0 && (
          <span>
            <span className="font-medium text-yellow-400">
              {report.blocksOmitted}
            </span>{" "}
            omitted
          </span>
        )}
        <span className="text-gray-600">|</span>
        <span>
          {report.totalTokensUsed.toLocaleString()} tokens
          {report.totalTokensBudget > 0 &&
            ` / ${report.totalTokensBudget.toLocaleString()}`}
        </span>
      </div>

      {/* Entries table */}
      {report.entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-600">
                <th className="pb-1.5 pr-3 font-medium">Status</th>
                <th className="pb-1.5 pr-3 font-medium">Artifact</th>
                <th className="pb-1.5 pr-3 font-medium">Block</th>
                <th className="pb-1.5 pr-3 font-medium text-right">Priority</th>
                <th className="pb-1.5 pr-3 font-medium text-right">Tokens</th>
                <th className="pb-1.5 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {report.entries.map((entry, i) => (
                <tr
                  key={i}
                  className={
                    entry.included
                      ? "text-gray-300"
                      : "text-gray-600"
                  }
                >
                  <td className="py-1.5 pr-3">
                    {entry.included ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-gray-600" />
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className={entry.included ? "" : "line-through"}>
                      {entry.artifactName}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className={entry.included ? "text-gray-200" : "line-through"}>
                      {entry.blockLabel}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {entry.priority}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {entry.tokenCount.toLocaleString()}
                  </td>
                  <td className="py-1.5 text-gray-500">
                    {entry.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.entries.length === 0 && (
        <p className="text-xs text-gray-600">No artifact blocks referenced.</p>
      )}
    </div>
  );
}

export default InjectionPanel;
