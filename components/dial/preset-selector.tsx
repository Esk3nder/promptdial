'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { DialPreset } from '@/lib/dial/types';
import { PRESET_LABELS, PRESET_DESCRIPTIONS, PRESET_ORDER } from '@/lib/dial/presets';
import {
  Zap,
  GraduationCap,
  Wrench,
  Compass,
  MessageCircleQuestion,
  Lightbulb,
  ClipboardList,
  BarChart3,
  Settings2,
  Sparkles,
} from 'lucide-react';

interface PresetSelectorProps {
  value: DialPreset;
  onChange: (value: DialPreset) => void;
  disabled?: boolean;
}

// Icons for each preset
const PRESET_ICONS: Record<DialPreset, React.ReactNode> = {
  default: <Settings2 className="h-4 w-4" />,
  custom: <Sparkles className="h-4 w-4" />,
  laser: <Zap className="h-4 w-4" />,
  scholar: <GraduationCap className="h-4 w-4" />,
  builder: <Wrench className="h-4 w-4" />,
  strategist: <Compass className="h-4 w-4" />,
  socratic: <MessageCircleQuestion className="h-4 w-4" />,
  brainstorm: <Lightbulb className="h-4 w-4" />,
  pm: <ClipboardList className="h-4 w-4" />,
  analyst: <BarChart3 className="h-4 w-4" />,
};

export function PresetSelector({ value, onChange, disabled }: PresetSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Preset</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as DialPreset)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full h-10">
          <SelectValue>
            <div className="flex items-center gap-2">
              {PRESET_ICONS[value]}
              <span>{PRESET_LABELS[value]}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Show Custom first if currently selected */}
          {value === 'custom' && (
            <SelectItem value="custom">
              <div className="flex items-center gap-2">
                {PRESET_ICONS.custom}
                <div className="flex flex-col">
                  <span>{PRESET_LABELS.custom}</span>
                  <span className="text-xs text-muted-foreground">
                    Manually adjusted settings
                  </span>
                </div>
              </div>
            </SelectItem>
          )}
          {PRESET_ORDER.map((preset) => (
            <SelectItem key={preset} value={preset}>
              <div className="flex items-center gap-2">
                {PRESET_ICONS[preset]}
                <div className="flex flex-col">
                  <span>{PRESET_LABELS[preset]}</span>
                  <span className="text-xs text-muted-foreground">
                    {PRESET_DESCRIPTIONS[preset]}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
