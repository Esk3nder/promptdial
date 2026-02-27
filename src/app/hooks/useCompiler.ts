"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { CompileInput, CompileOutput } from "@/core/types";

export function useCompiler() {
  const [output, setOutput] = useState<CompileOutput | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const compileNow = useCallback(async (input: CompileInput) => {
    setCompiling(true);
    setError(null);
    try {
      const { compile: runCompile } = await import("@/compiler/pipeline");
      const { resolveRefs } = await import("@/artifacts/resolver");
      const { getArtifactById } = await import("@/artifacts/store");

      const result = await runCompile(
        input,
        (refs: string[]) => resolveRefs(refs),
        (id: string) => getArtifactById(id).then((a) => a ?? null)
      );
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compilation failed");
    } finally {
      setCompiling(false);
    }
  }, []);

  const compile = useCallback(
    (input: CompileInput) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => compileNow(input), 500);
    },
    [compileNow]
  );

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOutput(null);
    setError(null);
    setCompiling(false);
  }, []);

  return { output, compiling, error, compile, compileNow, clear };
}
