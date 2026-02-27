"use client";

import type { ArtifactRef } from "@/core/types";

interface ArtifactChipsProps {
  refs: ArtifactRef[];
  onClickArtifact?: (artifactId: string) => void;
}

export default function ArtifactChips({
  refs,
  onClickArtifact,
}: ArtifactChipsProps) {
  if (!refs.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {refs.map((ref, i) => (
        <button
          key={`${ref.raw}-${i}`}
          onClick={() => ref.resolved && onClickArtifact?.(ref.artifactId)}
          title={ref.resolved ? ref.artifactName : `${ref.raw} — not found`}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
            ref.resolved
              ? "bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900/70"
              : "bg-red-900/50 text-red-300 cursor-default"
          }`}
        >
          <span>@</span>
          <span>{ref.resolved ? ref.artifactName : ref.raw}</span>
          {!ref.resolved && (
            <span className="ml-0.5 text-[10px] opacity-70">?</span>
          )}
        </button>
      ))}
    </div>
  );
}
