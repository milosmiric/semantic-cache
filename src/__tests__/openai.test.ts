/**
 * Unit tests for OpenAILLM.
 *
 * Tests the OpenAI LLM provider interface and structured output support.
 * Uses interface verification since actual API calls require valid keys.
 */

import { describe, test, expect } from "bun:test";
import { OpenAILLM } from "../lib/llm/openai";

describe("OpenAILLM", () => {
  describe("constructor", () => {
    test("should create instance with default model", () => {
      const llm = new OpenAILLM("test-api-key");
      expect(llm.getModel()).toBe("gpt-5-mini");
    });

    test("should create instance with custom model", () => {
      const llm = new OpenAILLM("test-api-key", "gpt-5-mini");
      expect(llm.getModel()).toBe("gpt-5-mini");
    });
  });

  describe("getModel", () => {
    test("should return the configured model", () => {
      const llm = new OpenAILLM("test-key", "gpt-5-nano");
      expect(llm.getModel()).toBe("gpt-5-nano");
    });
  });

  describe("complete (interface)", () => {
    test("should have complete method", () => {
      const llm = new OpenAILLM("test-key");
      expect(typeof llm.complete).toBe("function");
    });
  });

  describe("completeStructured (interface)", () => {
    test("should have completeStructured method", () => {
      const llm = new OpenAILLM("test-key");
      expect(typeof llm.completeStructured).toBe("function");
    });
  });

  describe("completeWithTiming (interface)", () => {
    test("should have completeWithTiming method", () => {
      const llm = new OpenAILLM("test-key");
      expect(typeof llm.completeWithTiming).toBe("function");
    });
  });
});
