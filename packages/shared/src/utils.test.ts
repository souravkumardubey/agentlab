import { describe, it, expect } from 'vitest';
import { cn, truncate, formatTokenCount, formatLatency, generateId } from './index.js';

describe('Shared Utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toContain('text-red-500');
      expect(result).toContain('text-blue-500');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'active', false && 'hidden');
      expect(result).toContain('base');
      expect(result).toContain('active');
      expect(result).not.toContain('hidden');
    });
  });

  describe('truncate', () => {
    it('should not truncate short strings', () => {
      const result = truncate('hello', 10);
      expect(result).toBe('hello');
    });

    it('should truncate long strings', () => {
      const result = truncate('hello world this is a long string', 10);
      expect(result).toBe('hello w...');
      expect(result.length).toBe(10);
    });

    it('should handle exact length strings', () => {
      const result = truncate('hello', 5);
      expect(result).toBe('hello');
    });
  });

  describe('formatTokenCount', () => {
    it('should format small token counts', () => {
      expect(formatTokenCount(500)).toBe('500 tokens');
    });

    it('should format thousands', () => {
      expect(formatTokenCount(1500)).toBe('1.5K tokens');
    });

    it('should format millions', () => {
      expect(formatTokenCount(1500000)).toBe('1.5M tokens');
    });
  });

  describe('formatLatency', () => {
    it('should format milliseconds', () => {
      expect(formatLatency(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatLatency(1500)).toBe('1.50s');
    });
  });

  describe('generateId', () => {
    it('should generate a UUID', () => {
      const id = generateId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(36);
    });
  });
});
