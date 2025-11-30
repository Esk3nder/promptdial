import type { DialPreset, DialValues, DialUIState } from './types';

// Preset configurations based on kernel.ts definitions
export const DIAL_PRESETS: Record<Exclude<DialPreset, 'custom'>, DialValues> = {
  default: {
    depth: 3,
    breadth: 3,
    verbosity: 3,
    creativity: 2,
    riskTolerance: 2,
    outputFormat: 'markdown',
  },
  laser: {
    depth: 2,
    breadth: 1,
    verbosity: 1,
    creativity: 1,
    riskTolerance: 1,
    outputFormat: 'markdown',
  },
  scholar: {
    depth: 5,
    breadth: 3,
    verbosity: 4,
    creativity: 2,
    riskTolerance: 1,
    outputFormat: 'markdown',
  },
  builder: {
    depth: 4,
    breadth: 2,
    verbosity: 2,
    creativity: 3,
    riskTolerance: 2,
    outputFormat: 'markdown',
  },
  strategist: {
    depth: 4,
    breadth: 4,
    verbosity: 3,
    creativity: 3,
    riskTolerance: 3,
    outputFormat: 'markdown',
  },
  socratic: {
    depth: 3,
    breadth: 2,
    verbosity: 3,
    creativity: 2,
    riskTolerance: 1,
    outputFormat: 'markdown',
  },
  brainstorm: {
    depth: 3,
    breadth: 5,
    verbosity: 3,
    creativity: 5,
    riskTolerance: 4,
    outputFormat: 'markdown',
  },
  pm: {
    depth: 4,
    breadth: 3,
    verbosity: 3,
    creativity: 2,
    riskTolerance: 2,
    outputFormat: 'markdown',
  },
  analyst: {
    depth: 5,
    breadth: 4,
    verbosity: 4,
    creativity: 1,
    riskTolerance: 1,
    outputFormat: 'markdown',
  },
};

// Preset display names for the UI
export const PRESET_LABELS: Record<DialPreset, string> = {
  default: 'Default',
  custom: 'Custom',
  laser: 'Laser',
  scholar: 'Scholar',
  builder: 'Builder',
  strategist: 'Strategist',
  socratic: 'Socratic',
  brainstorm: 'Brainstorm',
  pm: 'PM',
  analyst: 'Analyst',
};

// Preset descriptions for tooltips
export const PRESET_DESCRIPTIONS: Record<Exclude<DialPreset, 'custom'>, string> = {
  default: 'Balanced settings with no modifications',
  laser: 'Fast, concise execution',
  scholar: 'Rigorous, well-evidenced reasoning',
  builder: 'Practical artifact creation',
  strategist: 'Multi-path exploration',
  socratic: 'Guided questioning',
  brainstorm: 'High idea volume & diversity',
  pm: 'Scoped plans & prioritization',
  analyst: 'Structured analysis',
};

// Get values for a preset
export function getPresetValues(preset: DialPreset): DialValues {
  if (preset === 'custom') {
    // Return default values for custom (user will modify)
    return { ...DIAL_PRESETS.default };
  }
  return { ...DIAL_PRESETS[preset] };
}

// Detect if current values match any preset
export function detectPreset(values: DialValues): DialPreset {
  for (const [presetName, presetValues] of Object.entries(DIAL_PRESETS)) {
    if (
      values.depth === presetValues.depth &&
      values.breadth === presetValues.breadth &&
      values.verbosity === presetValues.verbosity &&
      values.creativity === presetValues.creativity &&
      values.riskTolerance === presetValues.riskTolerance &&
      values.outputFormat === presetValues.outputFormat
    ) {
      return presetName as DialPreset;
    }
  }
  return 'custom';
}

// Create default UI state
export function createDefaultDialState(): DialUIState {
  return {
    preset: 'default',
    values: { ...DIAL_PRESETS.default },
  };
}

// Dial descriptions for tooltips
export const DIAL_DESCRIPTIONS: Record<keyof Omit<DialValues, 'outputFormat'>, string> = {
  depth: 'How deeply to analyze the problem (0=quick, 5=thorough)',
  breadth: 'How many alternatives to consider (0=focused, 5=expansive)',
  verbosity: 'Response length and detail level (0=terse, 5=comprehensive)',
  creativity: 'Tolerance for novel ideas and framing (0=conservative, 5=innovative)',
  riskTolerance: 'Willingness to make bold suggestions (0=safe, 5=bold)',
};

// Ordered list of presets for the dropdown (excluding 'custom')
export const PRESET_ORDER: Exclude<DialPreset, 'custom'>[] = [
  'default',
  'laser',
  'scholar',
  'builder',
  'strategist',
  'socratic',
  'brainstorm',
  'pm',
  'analyst',
];
