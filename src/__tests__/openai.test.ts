/**
 * Unit tests for VercelAILLM.
 *
 * Tests the Vercel AI SDK LLM provider interface.
 * Uses interface verification since actual API calls require valid keys.
 */

import { describe, test, expect } from "bun:test";
import { VercelAILLM } from "@/lib/llm/vercel-ai";

// Mock LanguageModel for testing
const mockLanguageModel = {
  modelId: "mock-model-id",
  provider: "mock-provider",
  specificationVersion: "v1",
  defaultObjectGenerationMode: "json" as const,
  doGenerate: async () => ({
    text: "mock response",
    finishReason: "stop" as const,
    usage: { promptTokens: 10, completionTokens: 20 },
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
  doStream: async () => ({
    stream: new ReadableStream(),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
};

describe("VercelAILLM", () => {
  describe("constructor", () => {
    test("should create instance with a LanguageModel", () => {
      const llm = new VercelAILLM(mockLanguageModel as any);
      expect(llm).toBeInstanceOf(VercelAILLM);
    });
  });

  describe("getModel", () => {
    test("should return the model ID from the LanguageModel", () => {
      const llm = new VercelAILLM(mockLanguageModel as any);
      expect(llm.getModel()).toBe("mock-model-id");
    });
  });

  describe("interface compliance", () => {
    test("should have complete method", () => {
      const llm = new VercelAILLM(mockLanguageModel as any);
      expect(typeof llm.complete).toBe("function");
    });

    test("should have completeStructured method", () => {
      const llm = new VercelAILLM(mockLanguageModel as any);
      expect(typeof llm.completeStructured).toBe("function");
    });

    test("should have completeWithTiming method", () => {
      const llm = new VercelAILLM(mockLanguageModel as any);
      expect(typeof llm.completeWithTiming).toBe("function");
    });

    test("should have getModel method", () => {
      const llm = new VercelAILLM(mockLanguageModel as any);
      expect(typeof llm.getModel).toBe("function");
    });
  });

  describe("LLMProvider interface", () => {
    test("should implement all required LLMProvider methods", () => {
      const llm = new VercelAILLM(mockLanguageModel as any);

      // Check all required methods exist
      expect(llm.complete).toBeDefined();
      expect(llm.completeStructured).toBeDefined();
      expect(llm.getModel).toBeDefined();
    });
  });
});
