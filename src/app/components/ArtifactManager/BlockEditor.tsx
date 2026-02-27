"use client";

import { useState, useEffect } from "react";
import type { ArtifactBlock } from "@/core/types";
import { estimateTokens } from "@/app/lib/tokens";

export function BlockEditor({
  block,
  onChange,
  onRemove,
}: {
  block: ArtifactBlock;
  onChange: (updated: ArtifactBlock) => void;
  onRemove: () => void;
}) {
  const [label, setLabel] = useState(block.label);
  const [content, setContent] = useState(block.content);
  const [tagsInput, setTagsInput] = useState(block.tags.join(", "));
  const [priority, setPriority] = useState(block.priority);
  const [doNotSend, setDoNotSend] = useState(block.doNotSend);
  const [tokenCount, setTokenCount] = useState(block.tokenCount);

  useEffect(() => {
    setTokenCount(estimateTokens(content));
  }, [content]);

  useEffect(() => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onChange({
      ...block,
      label,
      content,
      tags,
      priority,
      doNotSend,
      tokenCount,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, content, tagsInput, priority, doNotSend, tokenCount]);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Block label"
          className="bg-transparent text-sm font-medium text-zinc-100 border-b border-zinc-600 focus:border-blue-500 outline-none pb-1 flex-1 mr-4"
        />
        <button
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-300 shrink-0"
        >
          Remove
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Block content..."
        rows={4}
        className="w-full bg-zinc-900 text-sm text-zinc-200 rounded p-2 border border-zinc-700 focus:border-blue-500 outline-none resize-y"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="tag1, tag2"
            className="w-full bg-zinc-900 text-sm text-zinc-200 rounded px-2 py-1 border border-zinc-700 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Priority (0-100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="w-full bg-zinc-900 text-sm text-zinc-200 rounded px-2 py-1 border border-zinc-700 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={doNotSend}
            onChange={(e) => setDoNotSend(e.target.checked)}
            className="rounded border-zinc-600"
          />
          <span>Do not send</span>
        </label>
        <span>~{tokenCount} tokens</span>
      </div>
    </div>
  );
}
