"use client";

import { useState } from "react";
import type { Artifact } from "@/core/types";

export function ArtifactList({
  artifacts,
  onSelect,
  onDelete,
  onCreate,
}: {
  artifacts: Artifact[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const filtered = artifacts.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
  );

  function handleDelete(id: string) {
    if (pendingDelete === id) {
      onDelete(id);
      setPendingDelete(null);
    } else {
      setPendingDelete(id);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search artifacts..."
          className="flex-1 bg-zinc-900 text-sm text-zinc-200 rounded px-3 py-2 border border-zinc-700 focus:border-blue-500 outline-none"
        />
        <button
          onClick={onCreate}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors whitespace-nowrap"
        >
          + New
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-zinc-500 text-center py-6">
          {search ? "No artifacts match your search." : "No artifacts yet."}
        </p>
      )}

      <div className="space-y-1">
        {filtered.map((artifact) => (
          <div
            key={artifact.id}
            className="flex items-center gap-2 p-3 rounded-lg hover:bg-zinc-800/60 transition-colors group"
          >
            <button
              onClick={() => onSelect(artifact.id)}
              className="flex-1 text-left min-w-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-100 truncate">
                  {artifact.name}
                </span>
                {artifact.isSeed && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-zinc-700 text-zinc-400 rounded">
                    seed
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 truncate mt-0.5">
                {artifact.description}
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {artifact.blocks.length} block{artifact.blocks.length !== 1 ? "s" : ""}
              </p>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(artifact.id);
              }}
              className={`text-xs px-2 py-1 rounded shrink-0 transition-colors ${
                pendingDelete === artifact.id
                  ? "bg-red-600 text-white"
                  : "text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
              }`}
              onBlur={() => setPendingDelete(null)}
            >
              {pendingDelete === artifact.id ? "Confirm" : "Delete"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
