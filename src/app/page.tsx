"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { DialLevel, TemplateId } from "@/core/types";
import { useCompiler } from "@/app/hooks/useCompiler";
import { useArtifacts } from "@/app/hooks/useArtifacts";
import Editor from "@/app/components/Editor";
import TemplatePicker from "@/app/components/TemplatePicker";
import DialControl from "@/app/components/DialControl";
import ArtifactChips from "@/app/components/ArtifactChips";
import OutputPanel from "@/app/components/OutputPanel";

const LintPanel = dynamic(() => import("@/app/components/LintPanel"), {
  ssr: false,
});
const InjectionPanel = dynamic(
  () => import("@/app/components/InjectionPanel"),
  { ssr: false }
);
const ArtifactManagerPanel = dynamic(
  () => import("@/app/components/ArtifactManager"),
  { ssr: false, loading: () => <div className="text-center text-sm text-gray-500 py-4">Loading...</div> }
);

export default function Home() {
  const [rawInput, setRawInput] = useState("");
  const [dial, setDial] = useState<DialLevel>(3);
  const [templateOverride, setTemplateOverride] = useState<
    TemplateId | undefined
  >(undefined);
  const [tokenBudget, setTokenBudget] = useState(0);
  const [showArtifactManager, setShowArtifactManager] = useState(false);

  const { output, compiling, error, compile, clear } = useCompiler();
  const { artifacts, create, update, remove } = useArtifacts();

  // Trigger compilation on input changes
  useEffect(() => {
    if (!rawInput.trim()) {
      clear();
      return;
    }
    compile({
      rawInput,
      dial,
      tokenBudget,
      templateOverride,
    });
  }, [rawInput, dial, tokenBudget, templateOverride, compile, clear]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (rawInput.trim()) {
          compile({
            rawInput,
            dial,
            tokenBudget,
            templateOverride,
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rawInput, dial, tokenBudget, templateOverride, compile]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <h1 className="text-lg font-bold tracking-tight text-white">
          Prompt Dial
        </h1>
        <div className="flex items-center gap-3">
          <label
            className="flex items-center gap-2 text-xs text-gray-400"
            title="Limits tokens for injected @artifact blocks. 0 = unlimited. Does not affect template structure."
          >
            Token budget
            <input
              type="number"
              min={0}
              step={100}
              value={tokenBudget}
              onChange={(e) => setTokenBudget(Number(e.target.value))}
              placeholder="0 = unlimited"
              className="w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none"
            />
          </label>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left: Input Panel */}
        <div className="flex flex-col gap-4 border-b border-gray-800 p-4 md:w-2/5 md:border-b-0 md:border-r">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Template
            </label>
            <TemplatePicker
              value={templateOverride}
              onChange={setTemplateOverride}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Dial Level
            </label>
            <DialControl
              value={dial}
              onChange={(v) => setDial(v as DialLevel)}
            />
          </div>

          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Input
            </label>
            <Editor
              value={rawInput}
              onChange={setRawInput}
              artifacts={artifacts.map((a) => ({
                id: a.id,
                name: a.name,
                aliases: a.aliases,
              }))}
            />
          </div>

          {output?.spec.artifactRefs && output.spec.artifactRefs.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Referenced Artifacts
              </label>
              <ArtifactChips refs={output.spec.artifactRefs} />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Right: Output Panel */}
        <div className="flex flex-1 flex-col p-4 md:w-3/5">
          <div className="flex-1 rounded-lg border border-gray-800 bg-gray-900 p-4">
            <OutputPanel
              rendered={output?.rendered ?? ""}
              spec={output?.spec ?? null}
              compiling={compiling}
            />
          </div>

          {/* Lint & Injection panels */}
          {output && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {output.lint && (
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
                  <LintPanel report={output.lint} />
                </div>
              )}
              {output.injection && (
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
                  <InjectionPanel report={output.injection} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Artifact Manager toggle */}
      <div className="border-t border-gray-800">
        <button
          onClick={() => setShowArtifactManager(!showArtifactManager)}
          className="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-900 hover:text-gray-200"
        >
          <span>{showArtifactManager ? "▼" : "▲"}</span>
          Artifact Manager
          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs">
            {artifacts.length}
          </span>
        </button>
        {showArtifactManager && (
          <div className="border-t border-gray-800 p-4">
            <ArtifactManagerPanel />
          </div>
        )}
      </div>
    </div>
  );
}
