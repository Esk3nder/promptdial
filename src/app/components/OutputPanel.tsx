"use client";

import { useCallback } from "react";
import type { PromptSpec } from "@/core/types";
import { estimateTokens } from "@/app/lib/tokens";

interface OutputPanelProps {
  rendered: string;
  spec: PromptSpec | null;
  compiling: boolean;
}

export default function OutputPanel({
  rendered,
  spec,
  compiling,
}: OutputPanelProps) {
  const tokenCount = estimateTokens(rendered);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rendered);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = rendered;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }, [rendered]);

  const exportJson = useCallback(() => {
    if (!spec) return;
    const blob = new Blob([JSON.stringify(spec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-spec-${spec.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [spec]);

  if (compiling) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg
            className="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Compiling...
        </div>
      </div>
    );
  }

  if (!rendered) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">Enter a prompt to get started</p>
          <p className="mt-1 text-sm">
            Your compiled prompt will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
          >
            Copy
          </button>
          {spec && (
            <button
              onClick={exportJson}
              className="rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
            >
              Export JSON
            </button>
          )}
        </div>
        <span className="text-xs text-gray-500">
          ~{tokenCount.toLocaleString()} tokens
        </span>
      </div>

      {/* Rendered output */}
      <div className="flex-1 overflow-y-auto">
        <div className="font-mono text-sm leading-relaxed">
          {rendered.split("\n").map((line, i) => {
            // System instruction block detection
            if (
              line.toLowerCase().startsWith("## system") ||
              line.toLowerCase().startsWith("# system")
            ) {
              return (
                <div
                  key={i}
                  className="mt-2 rounded bg-indigo-950/40 px-3 py-1 font-bold text-indigo-300"
                >
                  {line}
                </div>
              );
            }

            // Section headers
            if (line.startsWith("# ")) {
              return (
                <div key={i} className="mt-4 text-base font-bold text-white">
                  {line}
                </div>
              );
            }
            if (line.startsWith("## ")) {
              return (
                <div
                  key={i}
                  className="mt-3 text-sm font-bold text-indigo-400"
                >
                  {line}
                </div>
              );
            }
            if (line.startsWith("### ")) {
              return (
                <div key={i} className="mt-2 text-sm font-semibold text-gray-300">
                  {line}
                </div>
              );
            }

            // Injected context blocks (lines with [Context: ...])
            if (line.includes("[Context:") || line.includes("[Artifact:")) {
              return (
                <div
                  key={i}
                  className="border-l-2 border-emerald-600 pl-3 text-emerald-300/80"
                >
                  {line}
                </div>
              );
            }

            // Empty lines
            if (!line.trim()) {
              return <div key={i} className="h-3" />;
            }

            // Regular lines
            return (
              <div key={i} className="text-gray-300">
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
