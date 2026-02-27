"use client";

interface DialControlProps {
  value: number;
  onChange: (value: number) => void;
}

const labels = [
  "Minimal",
  "Brief",
  "Standard",
  "Detailed",
  "Thorough",
  "Maximum",
];

const colors = [
  "text-blue-400",
  "text-cyan-400",
  "text-green-400",
  "text-yellow-400",
  "text-orange-400",
  "text-red-400",
];

export default function DialControl({ value, onChange }: DialControlProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Depth</span>
        <span className={`text-sm font-semibold ${colors[value]}`}>
          {value} — {labels[value]}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-indigo-500"
      />
      <div className="flex justify-between text-[10px] text-gray-500">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
