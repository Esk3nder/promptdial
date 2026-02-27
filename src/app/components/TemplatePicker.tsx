"use client";

import type { TemplateId } from "@/core/types";

interface TemplatePickerProps {
  value: TemplateId | undefined;
  onChange: (value: TemplateId | undefined) => void;
}

const templates: { id: TemplateId | undefined; label: string }[] = [
  { id: undefined, label: "Auto" },
  { id: "academic-report", label: "Report" },
  { id: "prd", label: "PRD" },
  { id: "decision-memo", label: "Decision" },
  { id: "critique", label: "Critique" },
  { id: "research-brief", label: "Brief" },
];

export default function TemplatePicker({
  value,
  onChange,
}: TemplatePickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {templates.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.label}
            onClick={() => onChange(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
