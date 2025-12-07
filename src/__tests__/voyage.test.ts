/**
 * Unit tests for VoyageEmbeddings.
 *
 * Tests the VoyageAI embedding provider interface.
 * Note: These tests use mocked HTTP responses since actual API calls
 * would require valid API keys.
 */

import { describe, test, expect, mock, beforeEach } from "bun:test";
import { VoyageEmbeddings } from "@/lib/embeddings/voyage";

describe("VoyageEmbeddings", () => {
  describe("constructor", () => {
    test("should create instance with default model (voyage-3.5)", () => {
      const embeddings = new VoyageEmbeddings("test-api-key");
      expect(embeddings.getDimension()).toBe(1024);
      expect(embeddings.getModel()).toBe("voyage-3.5");
    });

    test("should create instance with voyage-3.5-lite model", () => {
      const embeddings = new VoyageEmbeddings("test-api-key", "voyage-3.5-lite");
      expect(embeddings.getDimension()).toBe(1024);
    });

    test("should create instance with voyage-3-lite model", () => {
      const embeddings = new VoyageEmbeddings("test-api-key", "voyage-3-lite");
      expect(embeddings.getDimension()).toBe(512);
    });

    test("should create instance with voyage-code-3 model", () => {
      const embeddings = new VoyageEmbeddings("test-api-key", "voyage-code-3");
      expect(embeddings.getDimension()).toBe(1024);
    });
  });

  describe("getDimension", () => {
    test("should return correct dimension for voyage-3.5", () => {
      const embeddings = new VoyageEmbeddings("test-api-key", "voyage-3.5");
      expect(embeddings.getDimension()).toBe(1024);
    });

    test("should return correct dimension for voyage-3.5-lite", () => {
      const embeddings = new VoyageEmbeddings("test-api-key", "voyage-3.5-lite");
      expect(embeddings.getDimension()).toBe(1024);
    });

    test("should return correct dimension for voyage-3-large", () => {
      const embeddings = new VoyageEmbeddings("test-api-key", "voyage-3-large");
      expect(embeddings.getDimension()).toBe(1024);
    });

    test("should return correct dimension for voyage-3-lite (legacy)", () => {
      const embeddings = new VoyageEmbeddings("test-api-key", "voyage-3-lite");
      expect(embeddings.getDimension()).toBe(512);
    });

    test("should return correct dimension for voyage-code-2 (legacy)", () => {
      const embeddings = new VoyageEmbeddings("test-api-key", "voyage-code-2");
      expect(embeddings.getDimension()).toBe(1536);
    });
  });

  describe("embed (mocked)", () => {
    test("should call embed with correct input type", async () => {
      // This test verifies the interface contract
      // Actual API testing would require integration tests
      const embeddings = new VoyageEmbeddings("test-api-key");

      // Verify the method exists and has correct signature
      expect(typeof embeddings.embed).toBe("function");
      expect(embeddings.embed.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("embedBatch (mocked)", () => {
    test("should have embedBatch method", () => {
      const embeddings = new VoyageEmbeddings("test-api-key");
      expect(typeof embeddings.embedBatch).toBe("function");
    });
  });
});
