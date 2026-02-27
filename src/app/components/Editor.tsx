"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";

interface ArtifactOption {
  id: string;
  name: string;
  aliases: string[];
}

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  artifacts: ArtifactOption[];
}

export default function Editor({ value, onChange, artifacts }: EditorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = artifacts.filter((a) => {
    const q = filter.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.aliases.some((al) => al.includes(q))
    );
  });

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.max(200, ta.scrollHeight) + "px";
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    onChange(val);

    // Detect @mention
    const before = val.slice(0, pos);
    const atIdx = before.lastIndexOf("@");

    if (atIdx !== -1 && !before.slice(atIdx).includes(" ")) {
      setMentionStart(atIdx);
      setFilter(before.slice(atIdx + 1));
      setShowDropdown(true);
      setSelectedIndex(0);
    } else {
      setShowDropdown(false);
    }
  };

  const insertMention = useCallback(
    (artifact: ArtifactOption) => {
      const before = value.slice(0, mentionStart);
      const after = value.slice(
        textareaRef.current?.selectionStart ?? mentionStart
      );
      const inserted = `${before}@${artifact.name}${after}`;
      onChange(inserted);
      setShowDropdown(false);

      requestAnimationFrame(() => {
        const pos = mentionStart + artifact.name.length + 1;
        textareaRef.current?.setSelectionRange(pos, pos);
        textareaRef.current?.focus();
      });
    },
    [value, mentionStart, onChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || !filtered.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you want... (e.g., 'Write a report on AI safety for technical leaders')"
        className="w-full min-h-[200px] resize-none rounded-lg border border-gray-700 bg-gray-950 p-3 font-mono text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {showDropdown && filtered.length > 0 && (
        <div className="absolute left-0 z-10 mt-1 max-h-48 w-64 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
          {filtered.map((a, i) => (
            <button
              key={a.id}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(a);
              }}
              className={`block w-full px-3 py-2 text-left text-sm ${
                i === selectedIndex
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <span className="font-medium">@{a.name}</span>
              {a.aliases.length > 0 && (
                <span className="ml-2 text-xs opacity-50">
                  {a.aliases.join(", ")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
