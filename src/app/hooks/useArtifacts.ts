"use client";

import { useState, useEffect, useCallback } from "react";
import type { Artifact } from "@/core/types";

export function useArtifacts() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);

  const loadArtifacts = useCallback(async () => {
    try {
      const { getAllArtifacts, initSeedArtifacts } = await import(
        "@/artifacts/store"
      );
      await initSeedArtifacts();
      const all = await getAllArtifacts();
      setArtifacts(all);
    } catch {
      // Artifact store not built yet — start with empty list
      setArtifacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

  const create = useCallback(
    async (artifact: Artifact) => {
      const { createArtifactInStore } = await import("@/artifacts/store");
      await createArtifactInStore(artifact);
      await loadArtifacts();
    },
    [loadArtifacts]
  );

  const update = useCallback(
    async (id: string, updates: Partial<Artifact>) => {
      const { updateArtifact } = await import("@/artifacts/store");
      await updateArtifact(id, updates);
      await loadArtifacts();
    },
    [loadArtifacts]
  );

  const remove = useCallback(
    async (id: string) => {
      const { deleteArtifact } = await import("@/artifacts/store");
      await deleteArtifact(id);
      await loadArtifacts();
    },
    [loadArtifacts]
  );

  return { artifacts, loading, create, update, remove, refresh: loadArtifacts };
}
