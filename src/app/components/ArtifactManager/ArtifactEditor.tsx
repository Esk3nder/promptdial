"use client";

import { useState } from "react";
import type { Artifact, ArtifactBlock } from "@/core/types";
import { createBlock } from "@/artifacts/model";
import { BlockEditor } from "./BlockEditor";

export function ArtifactEditor({
  artifact,
  onSave,
  onBack,
}: {
  artifact: Artifact;
  onSave: (updated: Artifact) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(artifact.name);
  const [description, setDescription] = useState(artifact.description);
  const [aliasesInput, setAliasesInput] = useState(artifact.aliases.join(", "));
  const [blocks, setBlocks] = useState<ArtifactBlock[]>(artifact.blocks);

  function handleBlockChange(index: number, updated: ArtifactBlock) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? updated : b)));
  }

  function handleBlockRemove(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddBlock() {
    setBlocks((prev) => [...prev, createBlock("New Block", "", [], 50)]);
  }

  function handleSave() {
    const aliases = aliasesInput
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);

    onSave({
      ...artifact,
      name,
      description,
      aliases,
      blocks,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          &larr; Back
        </button>
        <h2 className="text-lg font-semibold text-zinc-100 flex-1">
          {artifact.isSeed ? "View Seed Artifact" : "Edit Artifact"}
        </h2>
        {!artifact.isSeed && (
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors"
          >
            Save
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={artifact.isSeed}
            className="w-full bg-zinc-900 text-sm text-zinc-200 rounded px-3 py-2 border border-zinc-700 focus:border-blue-500 outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={artifact.isSeed}
            className="w-full bg-zinc-900 text-sm text-zinc-200 rounded px-3 py-2 border border-zinc-700 focus:border-blue-500 outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">
            Aliases (comma-separated)
          </label>
          <input
            type="text"
            value={aliasesInput}
            onChange={(e) => setAliasesInput(e.target.value)}
            disabled={artifact.isSeed}
            placeholder="alias1, alias2"
            className="w-full bg-zinc-900 text-sm text-zinc-200 rounded px-3 py-2 border border-zinc-700 focus:border-blue-500 outline-none disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-300">
            Blocks ({blocks.length})
          </h3>
          {!artifact.isSeed && (
            <button
              onClick={handleAddBlock}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              + Add Block
            </button>
          )}
        </div>

        {blocks.map((block, index) => (
          <BlockEditor
            key={block.id}
            block={block}
            onChange={(updated) => handleBlockChange(index, updated)}
            onRemove={() => handleBlockRemove(index)}
          />
        ))}

        {blocks.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-4">
            No blocks yet. Add one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
