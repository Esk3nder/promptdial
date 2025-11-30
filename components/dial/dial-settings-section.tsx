'use client';

import { useCallback } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, RotateCcw } from 'lucide-react';
import type { DialUIState, DialValues } from '@/lib/dial/types';
import {
  getPresetValues,
  detectPreset,
  createDefaultDialState,
  DIAL_DESCRIPTIONS,
} from '@/lib/dial/presets';
import { DialSlider } from './dial-slider';
import { PresetSelector } from './preset-selector';

interface DialSettingsSectionProps {
  dialSettings: DialUIState;
  onDialSettingsChange: (settings: DialUIState) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
}

export function DialSettingsSection({
  dialSettings,
  onDialSettingsChange,
  isOpen,
  onOpenChange,
  disabled = false,
}: DialSettingsSectionProps) {
  // Handle preset change
  const handlePresetChange = useCallback(
    (preset: DialUIState['preset']) => {
      const values = getPresetValues(preset);
      onDialSettingsChange({ preset, values });
    },
    [onDialSettingsChange]
  );

  // Handle individual dial change
  const handleDialChange = useCallback(
    (dial: keyof Omit<DialValues, 'outputFormat'>, value: number) => {
      const newValues = { ...dialSettings.values, [dial]: value };
      const detectedPreset = detectPreset(newValues);
      onDialSettingsChange({ preset: detectedPreset, values: newValues });
    },
    [dialSettings.values, onDialSettingsChange]
  );

  // Handle output format change
  const handleOutputFormatChange = useCallback(
    (format: DialValues['outputFormat']) => {
      const newValues = { ...dialSettings.values, outputFormat: format };
      const detectedPreset = detectPreset(newValues);
      onDialSettingsChange({ preset: detectedPreset, values: newValues });
    },
    [dialSettings.values, onDialSettingsChange]
  );

  // Handle reset to default
  const handleReset = useCallback(() => {
    onDialSettingsChange(createDefaultDialState());
  }, [onDialSettingsChange]);

  const isDefault = dialSettings.preset === 'default';

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between h-10 px-3 font-medium"
          disabled={disabled}
        >
          <span className="flex items-center gap-2">
            Advanced Settings
            {!isDefault && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                {dialSettings.preset === 'custom' ? 'Custom' : dialSettings.preset}
              </span>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-4">
        {/* Preset Selector */}
        <PresetSelector
          value={dialSettings.preset}
          onChange={handlePresetChange}
          disabled={disabled}
        />

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Fine-tune
            </span>
          </div>
        </div>

        {/* Individual Dials */}
        <div className="space-y-4">
          <DialSlider
            label="Depth"
            value={dialSettings.values.depth}
            onChange={(v) => handleDialChange('depth', v)}
            description={DIAL_DESCRIPTIONS.depth}
            disabled={disabled}
          />
          <DialSlider
            label="Breadth"
            value={dialSettings.values.breadth}
            onChange={(v) => handleDialChange('breadth', v)}
            description={DIAL_DESCRIPTIONS.breadth}
            disabled={disabled}
          />
          <DialSlider
            label="Verbosity"
            value={dialSettings.values.verbosity}
            onChange={(v) => handleDialChange('verbosity', v)}
            description={DIAL_DESCRIPTIONS.verbosity}
            disabled={disabled}
          />
          <DialSlider
            label="Creativity"
            value={dialSettings.values.creativity}
            onChange={(v) => handleDialChange('creativity', v)}
            description={DIAL_DESCRIPTIONS.creativity}
            disabled={disabled}
          />
          <DialSlider
            label="Risk Tolerance"
            value={dialSettings.values.riskTolerance}
            onChange={(v) => handleDialChange('riskTolerance', v)}
            description={DIAL_DESCRIPTIONS.riskTolerance}
            disabled={disabled}
          />
        </div>

        {/* Output Format */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Output Format</Label>
          <Select
            value={dialSettings.values.outputFormat}
            onValueChange={(v) =>
              handleOutputFormatChange(v as DialValues['outputFormat'])
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-full h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="markdown">Markdown</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Button */}
        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="w-full text-muted-foreground hover:text-foreground"
            disabled={disabled}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            Reset to Default
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
