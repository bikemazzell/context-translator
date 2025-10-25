/**
 * Tests for content script loader
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Loader', () => {
  describe('Module structure', () => {
    it('should use browser.runtime.getURL for module path', () => {
      const loaderPath = join(__dirname, '../content/loader.js');
      const source = readFileSync(loaderPath, 'utf-8');

      // Should use browser.runtime.getURL
      expect(source).toContain('browser.runtime.getURL');
      expect(source).toContain("'content/main.js'");
    });

    it('should use dynamic import pattern', () => {
      const loaderPath = join(__dirname, '../content/loader.js');
      const source = readFileSync(loaderPath, 'utf-8');

      // Should use dynamic import
      expect(source).toContain('await import(');
      expect(source).toContain('moduleUrl');
    });

    it('should include error handling', () => {
      const loaderPath = join(__dirname, '../content/loader.js');
      const source = readFileSync(loaderPath, 'utf-8');

      // Should have try-catch
      expect(source).toContain('try {');
      expect(source).toContain('catch (error)');
    });

    it('should include error logging', () => {
      const loaderPath = join(__dirname, '../content/loader.js');
      const source = readFileSync(loaderPath, 'utf-8');

      // Should log errors if loading fails
      expect(source).toContain('[ContextTranslator] Failed to load content script:');
    });

    it('should use IIFE pattern', () => {
      const loaderPath = join(__dirname, '../content/loader.js');
      const source = readFileSync(loaderPath, 'utf-8');

      // Should use async IIFE
      expect(source).toContain('(async () => {');
      expect(source).toContain('})()');
    });
  });
});
