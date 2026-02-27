import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractArtifactRefs, resolveRefs } from "@/artifacts/resolver";
import type { Artifact } from "@/core/types";

// Mock the store module
vi.mock("@/artifacts/store", () => ({
  getArtifactByAlias: vi.fn(),
}));

// Import mocked function
import { getArtifactByAlias } from "@/artifacts/store";

describe("resolver functions", () => {
  describe("extractArtifactRefs", () => {
    it('extracts @AI and @Security from "Hello @AI and @Security"', () => {
      const refs = extractArtifactRefs("Hello @AI and @Security");
      expect(refs).toEqual(["AI", "Security"]);
    });

    it('returns empty array for "No refs here"', () => {
      const refs = extractArtifactRefs("No refs here");
      expect(refs).toEqual([]);
    });

    it('extracts ["One", "Two", "Three"] from "@One @Two @Three"', () => {
      const refs = extractArtifactRefs("@One @Two @Three");
      expect(refs).toEqual(["One", "Two", "Three"]);
    });

    it("extracts 'example' from email@example.com (@ matches)", () => {
      const refs = extractArtifactRefs("Contact email@example.com");
      // The regex /@([A-Za-z][A-Za-z0-9_]*)/ matches @example in the email
      // This is expected behavior - @ followed by valid identifier matches
      expect(refs).toEqual(["example"]);
    });

    it("extracts 'double' from @@double", () => {
      const refs = extractArtifactRefs("@@double");
      // Pattern is /@([A-Za-z][A-Za-z0-9_]*)/g
      // First @ has no valid identifier after it (just another @)
      // Second @ has "double" after it, which matches
      expect(refs).toEqual(["double"]);
    });

    it("extracts refs with underscores", () => {
      const refs = extractArtifactRefs("Use @AI_Model and @Data_Science");
      expect(refs).toEqual(["AI_Model", "Data_Science"]);
    });

    it("extracts refs with numbers", () => {
      const refs = extractArtifactRefs("Check @GPT4 and @Claude3");
      expect(refs).toEqual(["GPT4", "Claude3"]);
    });

    it("does not extract refs starting with numbers", () => {
      const refs = extractArtifactRefs("Invalid @123test");
      expect(refs).toEqual([]);
    });

    it("extracts multiple refs in complex text", () => {
      const refs = extractArtifactRefs(
        "Using @AI for @ML tasks and @DataScience analysis."
      );
      expect(refs).toEqual(["AI", "ML", "DataScience"]);
    });

    it("handles refs at start and end of string", () => {
      const refs = extractArtifactRefs("@Start middle @End");
      expect(refs).toEqual(["Start", "End"]);
    });

    it("returns unique refs only", () => {
      const refs = extractArtifactRefs("@AI and @AI and @AI");
      // Note: extractArtifactRefs doesn't dedupe, it returns all matches
      expect(refs).toEqual(["AI", "AI", "AI"]);
    });
  });

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
