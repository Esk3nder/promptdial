import Dexie, { type EntityTable } from "dexie";
import type { Artifact } from "@/core/types";

export class PromptDialDB extends Dexie {
  artifacts!: EntityTable<Artifact, "id">;

  constructor() {
    super("prompt-dial");
    this.version(1).stores({
      artifacts: "id, name, *aliases",
    });
  }
}

export const db = new PromptDialDB();
