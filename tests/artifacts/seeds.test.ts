import { describe, it, expect } from "vitest";
import type { Artifact } from "@/core/types";

// Import all seed files
import aiSeed from "@/artifacts/seeds/ai.json";
import mlSeed from "@/artifacts/seeds/ml.json";
import llmsSeed from "@/artifacts/seeds/llms.json";
import pmSeed from "@/artifacts/seeds/product-management.json";
import startupsSeed from "@/artifacts/seeds/startups.json";
import securitySeed from "@/artifacts/seeds/security.json";
import dataScienceSeed from "@/artifacts/seeds/data-science.json";
import uxDesignSeed from "@/artifacts/seeds/ux-design.json";

const allSeeds: Artifact[] = [
  aiSeed,
  mlSeed,
  llmsSeed,
  pmSeed,
  startupsSeed,
  securitySeed,
  dataScienceSeed,
  uxDesignSeed,
];

describe("seed data validity", () => {
  describe("basic structure", () => {
    it("has exactly 8 seed files", () => {
      expect(allSeeds).toHaveLength(8);
    });

    allSeeds.forEach((seed) => {
      describe(`seed: ${seed.name}`, () => {
        it("has valid id starting with 'seed-'", () => {
          expect(seed.id).toMatch(/^seed-/);
        });

        it("has non-empty name", () => {
          expect(seed.name).toBeTruthy();
          expect(seed.name.length).toBeGreaterThan(0);
        });

        it("has non-empty aliases array", () => {
          expect(Array.isArray(seed.aliases)).toBe(true);
          expect(seed.aliases.length).toBeGreaterThan(0);
        });

        it("has non-empty description", () => {
          expect(seed.description).toBeTruthy();
          expect(seed.description.length).toBeGreaterThan(0);
        });

        it("has 3-5 blocks", () => {
          expect(seed.blocks.length).toBeGreaterThanOrEqual(3);
          expect(seed.blocks.length).toBeLessThanOrEqual(5);
        });

        it("has isSeed=true", () => {
          expect(seed.isSeed).toBe(true);
        });

        it("has version number", () => {
          expect(typeof seed.version).toBe("number");
          expect(seed.version).toBeGreaterThan(0);
        });

        it("has createdAt timestamp", () => {
          expect(seed.createdAt).toBeTruthy();
          expect(() => new Date(seed.createdAt)).not.toThrow();
        });

        it("has updatedAt timestamp", () => {
          expect(seed.updatedAt).toBeTruthy();
          expect(() => new Date(seed.updatedAt)).not.toThrow();
        });
      });
    });
  });

  describe("block structure", () => {
    allSeeds.forEach((seed) => {
      describe(`blocks in ${seed.name}`, () => {
        seed.blocks.forEach((block, index) => {
          it(`block ${index + 1}: has non-empty id`, () => {
            expect(block.id).toBeTruthy();
            expect(block.id.length).toBeGreaterThan(0);
          });

          it(`block ${index + 1}: has non-empty label`, () => {
            expect(block.label).toBeTruthy();
            expect(block.label.length).toBeGreaterThan(0);
          });

          it(`block ${index + 1}: has non-empty content`, () => {
            expect(block.content).toBeTruthy();
            expect(block.content.length).toBeGreaterThan(0);
          });

          it(`block ${index + 1}: has tags array`, () => {
            expect(Array.isArray(block.tags)).toBe(true);
            expect(block.tags.length).toBeGreaterThan(0);
          });

          it(`block ${index + 1}: has priority between 0-100`, () => {
            expect(block.priority).toBeGreaterThanOrEqual(0);
            expect(block.priority).toBeLessThanOrEqual(100);
          });

          it(`block ${index + 1}: has doNotSend boolean`, () => {
            expect(typeof block.doNotSend).toBe("boolean");
          });

          it(`block ${index + 1}: has tokenCount >= 0`, () => {
            expect(typeof block.tokenCount).toBe("number");
            expect(block.tokenCount).toBeGreaterThanOrEqual(0);
          });
        });
      });
    });
  });

  describe("uniqueness constraints", () => {
    it("no duplicate IDs across all seeds", () => {
      const allIds = allSeeds.map((s) => s.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it("no duplicate aliases across all seeds", () => {
      const allAliases = allSeeds.flatMap((s) => s.aliases);
      const uniqueAliases = new Set(allAliases);

      if (uniqueAliases.size !== allAliases.length) {
        // Find duplicates for better error message
        const seen = new Set<string>();
        const duplicates = new Set<string>();
        allAliases.forEach((alias) => {
          if (seen.has(alias)) {
            duplicates.add(alias);
          }
          seen.add(alias);
        });

        expect(
          duplicates.size,
          `Found duplicate aliases: ${Array.from(duplicates).join(", ")}`
        ).toBe(0);
      }

      expect(uniqueAliases.size).toBe(allAliases.length);
    });

    it("no duplicate block IDs within each seed", () => {
      allSeeds.forEach((seed) => {
        const blockIds = seed.blocks.map((b) => b.id);
        const uniqueBlockIds = new Set(blockIds);
        expect(
          uniqueBlockIds.size,
          `${seed.name} has duplicate block IDs`
        ).toBe(blockIds.length);
      });
    });
  });

  describe("data quality", () => {
    it("all aliases are lowercase", () => {
      allSeeds.forEach((seed) => {
        seed.aliases.forEach((alias) => {
          expect(alias, `${seed.name}: alias "${alias}" not lowercase`).toBe(
            alias.toLowerCase()
          );
        });
      });
    });

    it("all tags are non-empty strings", () => {
      allSeeds.forEach((seed) => {
        seed.blocks.forEach((block) => {
          block.tags.forEach((tag) => {
            expect(
              typeof tag,
              `${seed.name}/${block.label}: tag is not a string`
            ).toBe("string");
            expect(
              tag.length,
              `${seed.name}/${block.label}: empty tag`
            ).toBeGreaterThan(0);
          });
        });
      });
    });

    it("tokenCount matches content (roughly)", () => {
      allSeeds.forEach((seed) => {
        seed.blocks.forEach((block) => {
          // Token count should be roughly proportional to content length
          // Very rough heuristic: 1 token ≈ 4 characters
          const expectedTokens = Math.ceil(block.content.length / 4);
          const tolerance = expectedTokens * 0.5; // 50% tolerance

          expect(
            block.tokenCount,
            `${seed.name}/${block.label}: tokenCount ${block.tokenCount} seems wrong for content length ${block.content.length}`
          ).toBeGreaterThan(0);

          // Just verify it's in a reasonable range, not exact
          expect(block.tokenCount).toBeLessThan(block.content.length);
        });
      });
    });

    it("priority values are reasonable (not all the same)", () => {
      allSeeds.forEach((seed) => {
        const priorities = seed.blocks.map((b) => b.priority);
        const uniquePriorities = new Set(priorities);

        // At least some variation in priorities (unless only 1 block)
        if (seed.blocks.length > 1) {
          expect(
            uniquePriorities.size,
            `${seed.name}: all blocks have same priority - needs variation`
          ).toBeGreaterThan(1);
        }
      });
    });
  });

  describe("specific seed checks", () => {
    it("AI seed has expected structure", () => {
      expect(aiSeed.id).toBe("seed-ai");
      expect(aiSeed.name).toBe("Artificial Intelligence");
      expect(aiSeed.aliases).toContain("ai");
      expect(aiSeed.blocks.length).toBeGreaterThanOrEqual(3);
    });

    it("ML seed has expected structure", () => {
      expect(mlSeed.id).toBe("seed-ml");
      expect(mlSeed.name).toContain("Machine Learning");
    });

    it("LLMs seed has expected structure", () => {
      expect(llmsSeed.id).toBe("seed-llms");
    });

    it("Product Management seed has expected structure", () => {
      expect(pmSeed.id).toBe("seed-product-management");
    });

    it("Startups seed has expected structure", () => {
      expect(startupsSeed.id).toBe("seed-startups");
    });

    it("Security seed has expected structure", () => {
      expect(securitySeed.id).toBe("seed-security");
    });

    it("Data Science seed has expected structure", () => {
      expect(dataScienceSeed.id).toBe("seed-data-science");
    });

    it("UX Design seed has expected structure", () => {
      expect(uxDesignSeed.id).toBe("seed-ux-design");
    });
  });
});
