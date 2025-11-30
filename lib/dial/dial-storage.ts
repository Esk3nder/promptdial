import type { DialUIState } from './types';
import { createDefaultDialState } from './presets';

const STORAGE_KEY = 'promptdial_dial_settings';

// Save dial settings to localStorage
export function saveDialSettings(state: DialUIState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save dial settings:', error);
  }
}

// Load dial settings from localStorage
export function loadDialSettings(): DialUIState {
  if (typeof window === 'undefined') {
    return createDefaultDialState();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultDialState();
    }

    const parsed = JSON.parse(stored) as DialUIState;

    // Validate the parsed data has required fields
    if (
      parsed &&
      typeof parsed.preset === 'string' &&
      parsed.values &&
      typeof parsed.values.depth === 'number' &&
      typeof parsed.values.breadth === 'number' &&
      typeof parsed.values.verbosity === 'number' &&
      typeof parsed.values.creativity === 'number' &&
      typeof parsed.values.riskTolerance === 'number' &&
      typeof parsed.values.outputFormat === 'string'
    ) {
      return parsed;
    }

    // Invalid data, return defaults
    return createDefaultDialState();
  } catch (error) {
    console.error('Failed to load dial settings:', error);
    return createDefaultDialState();
  }
}

// Clear dial settings from localStorage
export function clearDialSettings(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear dial settings:', error);
  }
}
