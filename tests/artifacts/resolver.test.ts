import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveRefs } from "@/artifacts/resolver";
import type { Artifact } from "@/core/types";

// Mock the store module
vi.mock("@/artifacts/store", () => ({
  getArtifactByAlias: vi.fn(),
}));

// Import mocked function
import { getArtifactByAlias } from "@/artifacts/store";

describe("resolver functions", () => {
  describe("resolveRefs", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("resolved ref has resolved=true and artifactId set", async () => {
      const mockArtifact: Partial<Artifact> = {
        id: "artifact-123",
        name: "Artificial Intelligence",
      };

      vi.mocked(getArtifactByAlias).mockResolvedValue(
        mockArtifact as Artifact
      );

      const refs = await resolveRefs(["AI"]);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        raw: "AI",
        artifactId: "artifact-123",
        artifactName: "Artificial Intelligence",
        resolved: true,
      });
    });

    it("unresolved ref has resolved=false", async () => {
      vi.mocked(getArtifactByAlias).mockResolvedValue(null);

      const refs = await resolveRefs(["UnknownRef"]);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        raw: "UnknownRef",
        artifactId: "",
        artifactName: "",
        resolved: false,
      });
    });

    it("resolves multiple refs with mixed results", async () => {
      const mockAI: Partial<Artifact> = {
        id: "ai-123",
        name: "Artificial Intelligence",
      };
      const mockML: Partial<Artifact> = {
        id: "ml-456",
        name: "Machine Learning",
      };

      vi.mocked(getArtifactByAlias).mockImplementation(
        async (alias: string) => {
          if (alias === "ai") return mockAI as Artifact;
          if (alias === "ml") return mockML as Artifact;
          return null;
        }
      );

      const refs = await resolveRefs(["AI", "ML", "Unknown"]);

      expect(refs).toHaveLength(3);
      expect(refs[0].resolved).toBe(true);
      expect(refs[0].artifactId).toBe("ai-123");
      expect(refs[1].resolved).toBe(true);
      expect(refs[1].artifactId).toBe("ml-456");
      expect(refs[2].resolved).toBe(false);
      expect(refs[2].artifactId).toBe("");
    });

    it("normalizes refs to lowercase before lookup", async () => {
      const mockArtifact: Partial<Artifact> = {
        id: "artifact-123",
        name: "Test",
      };

      vi.mocked(getArtifactByAlias).mockResolvedValue(
        mockArtifact as Artifact
      );

      await resolveRefs(["MixedCase"]);

      expect(getArtifactByAlias).toHaveBeenCalledWith("mixedcase");
    });

    it("preserves raw ref casing in results", async () => {
      vi.mocked(getArtifactByAlias).mockResolvedValue(null);

      const refs = await resolveRefs(["MixedCase"]);

      expect(refs[0].raw).toBe("MixedCase");
    });

    it("handles empty array", async () => {
      const refs = await resolveRefs([]);
      expect(refs).toEqual([]);
    });

    it("calls getArtifactByAlias for each ref", async () => {
      vi.mocked(getArtifactByAlias).mockResolvedValue(null);

      await resolveRefs(["Ref1", "Ref2", "Ref3"]);

      expect(getArtifactByAlias).toHaveBeenCalledTimes(3);
      expect(getArtifactByAlias).toHaveBeenCalledWith("ref1");
      expect(getArtifactByAlias).toHaveBeenCalledWith("ref2");
      expect(getArtifactByAlias).toHaveBeenCalledWith("ref3");
    });
  });
});
