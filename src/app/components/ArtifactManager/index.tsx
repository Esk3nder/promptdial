"use client";

import { useState, useEffect, useCallback } from "react";
import type { Artifact } from "@/core/types";
import {
  getAllArtifacts,
  deleteArtifact,
  updateArtifact,
  createArtifactInStore,
  initSeedArtifacts,
} from "@/artifacts/store";
import { createArtifact } from "@/artifacts/model";
import { ArtifactList } from "./ArtifactList";
import { ArtifactEditor } from "./ArtifactEditor";

export default function ArtifactManager() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadArtifacts = useCallback(async () => {
    await initSeedArtifacts();
    const all = await getAllArtifacts();
    setArtifacts(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

  async function handleCreate() {
    const artifact = createArtifact("New Artifact", "");
    await createArtifactInStore(artifact);
    await loadArtifacts();
    setSelectedId(artifact.id);
  }

  async function handleDelete(id: string) {
    await deleteArtifact(id);
    if (selectedId === id) setSelectedId(null);
    await loadArtifacts();
  }

  async function handleSave(updated: Artifact) {
    await updateArtifact(updated.id, updated);
    await loadArtifacts();
  }

  if (loading) {
    return (
      <div className="text-sm text-zinc-500 py-4 text-center">
        Loading artifacts...
      </div>
    );
  }

  const selected = selectedId
    ? artifacts.find((a) => a.id === selectedId)
    : null;

  if (selected) {
    return (
      <ArtifactEditor
        artifact={selected}
        onSave={handleSave}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <ArtifactList
      artifacts={artifacts}
      onSelect={setSelectedId}
      onDelete={handleDelete}
      onCreate={handleCreate}
    />
  );
}
