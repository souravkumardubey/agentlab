import { describe, it, expect, vi } from 'vitest';
import { createLLMProvider, OpenAIProvider, GeminiProvider, GroqProvider, OllamaProvider, TogetherProvider, KimiProvider } from './index.js';

describe('LLM Package', () => {
  describe('createLLMProvider', () => {
    it('should create OpenAI provider by default', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const provider = createLLMProvider();
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should create OpenAI provider when specified', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const provider = createLLMProvider('openai');
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should create Gemini provider', () => {
      process.env.GEMINI_API_KEY = 'test-key';
      const provider = createLLMProvider('gemini');
      expect(provider).toBeInstanceOf(GeminiProvider);
    });

    it('should create Groq provider', () => {
      process.env.GROQ_API_KEY = 'test-key';
      const provider = createLLMProvider('groq');
      expect(provider).toBeInstanceOf(GroqProvider);
    });

    it('should create Ollama provider', () => {
      const provider = createLLMProvider('ollama');
      expect(provider).toBeInstanceOf(OllamaProvider);
    });

    it('should create Together provider', () => {
      process.env.TOGETHER_API_KEY = 'test-key';
      const provider = createLLMProvider('together');
      expect(provider).toBeInstanceOf(TogetherProvider);
    });

    it('should create Kimi provider', () => {
      process.env.KIMI_API_KEY = 'test-key';
      const provider = createLLMProvider('kimi');
      expect(provider).toBeInstanceOf(KimiProvider);
    });
  });

  describe('Provider interfaces', () => {
    it('should have chat method', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const provider = createLLMProvider('openai');
      expect(typeof provider.chat).toBe('function');
    });

    it('should have chatStream method', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const provider = createLLMProvider('openai');
      expect(typeof provider.chatStream).toBe('function');
    });

    it('should have embed method', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const provider = createLLMProvider('openai');
      expect(typeof provider.embed).toBe('function');
    });

    it('should have models method', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const provider = createLLMProvider('openai');
      expect(typeof provider.models).toBe('function');
    });
  });
});
