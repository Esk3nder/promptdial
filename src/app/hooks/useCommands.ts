"use client";

export function useCommands() {
  const parseCommands = (
    input: string
  ): { command: string; args: string } | null => {
    const match = input.match(/^\/(\w+)\s*(.*)/);
    if (!match) return null;
    return { command: match[1], args: match[2].trim() };
  };

  return { parseCommands };
}
