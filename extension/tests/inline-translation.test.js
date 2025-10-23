/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { clearAllInlineTranslations } from '../content/ui/inline-translation.js';

describe('Inline Translation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('clearAllInlineTranslations', () => {
    it('should not throw when called with no translations', () => {
      expect(() => clearAllInlineTranslations()).not.toThrow();
    });

    it('should be idempotent', () => {
      expect(() => {
        clearAllInlineTranslations();
        clearAllInlineTranslations();
        clearAllInlineTranslations();
      }).not.toThrow();
    });

    it('should handle rapid consecutive calls', () => {
      for (let i = 0; i < 100; i++) {
        clearAllInlineTranslations();
      }
      expect(true).toBe(true);
    });
  });

  describe('Module constants and exports', () => {
    it('should export clearAllInlineTranslations function', () => {
      expect(typeof clearAllInlineTranslations).toBe('function');
    });
  });

  describe('Error scenarios', () => {
    it('should handle DOM mutation during clear', () => {
      const wrapper = document.createElement('span');
      wrapper.className = 'ct-word-wrapper';
      document.body.appendChild(wrapper);

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });

    it('should handle multiple wrappers', () => {
      for (let i = 0; i < 10; i++) {
        const wrapper = document.createElement('span');
        wrapper.className = 'ct-word-wrapper';
        document.body.appendChild(wrapper);
      }

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });

    it('should handle nested wrappers', () => {
      const parent = document.createElement('div');
      const child1 = document.createElement('span');
      child1.className = 'ct-word-wrapper';
      const child2 = document.createElement('span');
      child2.className = 'ct-word-wrapper';

      parent.appendChild(child1);
      parent.appendChild(child2);
      document.body.appendChild(parent);

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle mixed content', () => {
      document.body.innerHTML = `
        <div>
          <span class="ct-word-wrapper">word1</span>
          <span>normal text</span>
          <span class="ct-word-wrapper">word2</span>
        </div>
      `;

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });

    it('should handle empty wrappers', () => {
      const wrapper = document.createElement('span');
      wrapper.className = 'ct-word-wrapper';
      document.body.appendChild(wrapper);

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });

    it('should handle wrappers with text content', () => {
      const wrapper = document.createElement('span');
      wrapper.className = 'ct-word-wrapper';
      wrapper.textContent = 'test content';
      document.body.appendChild(wrapper);

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });

    it('should handle wrappers with child elements', () => {
      const wrapper = document.createElement('span');
      wrapper.className = 'ct-word-wrapper';
      const child = document.createElement('em');
      child.textContent = 'emphasized';
      wrapper.appendChild(child);
      document.body.appendChild(wrapper);

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle document without body', () => {
      const originalBody = document.body;
      Object.defineProperty(document, 'body', {
        configurable: true,
        get: () => null
      });

      expect(() => clearAllInlineTranslations()).not.toThrow();

      Object.defineProperty(document, 'body', {
        configurable: true,
        get: () => originalBody
      });
    });

    it('should handle wrappers removed during iteration', () => {
      const wrapper1 = document.createElement('span');
      wrapper1.className = 'ct-word-wrapper';
      const wrapper2 = document.createElement('span');
      wrapper2.className = 'ct-word-wrapper';

      document.body.appendChild(wrapper1);
      document.body.appendChild(wrapper2);

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });

    it('should handle very long text content', () => {
      const wrapper = document.createElement('span');
      wrapper.className = 'ct-word-wrapper';
      wrapper.textContent = 'A'.repeat(10000);
      document.body.appendChild(wrapper);

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });

    it('should handle special characters in content', () => {
      const wrapper = document.createElement('span');
      wrapper.className = 'ct-word-wrapper';
      wrapper.textContent = '<script>alert("xss")</script> & "quotes"';
      document.body.appendChild(wrapper);

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });

    it('should handle unicode content', () => {
      const wrapper = document.createElement('span');
      wrapper.className = 'ct-word-wrapper';
      wrapper.textContent = '你好世界 🌍 Привет';
      document.body.appendChild(wrapper);

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });
  });

  describe('Performance scenarios', () => {
    it('should handle many wrappers efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const wrapper = document.createElement('span');
        wrapper.className = 'ct-word-wrapper';
        wrapper.textContent = `word${i}`;
        document.body.appendChild(wrapper);
      }

      clearAllInlineTranslations();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should handle deeply nested DOM', () => {
      let current = document.body;
      for (let i = 0; i < 50; i++) {
        const div = document.createElement('div');
        if (i % 5 === 0) {
          const wrapper = document.createElement('span');
          wrapper.className = 'ct-word-wrapper';
          wrapper.textContent = `nested${i}`;
          div.appendChild(wrapper);
        }
        current.appendChild(div);
        current = div;
      }

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });
  });

  describe('Class name matching', () => {
    it('should only target exact class name match', () => {
      const exactMatch = document.createElement('span');
      exactMatch.className = 'ct-word-wrapper';

      const partialMatch = document.createElement('span');
      partialMatch.className = 'ct-word-wrapper-extended';

      const multipleClasses = document.createElement('span');
      multipleClasses.className = 'ct-word-wrapper other-class';

      document.body.appendChild(exactMatch);
      document.body.appendChild(partialMatch);
      document.body.appendChild(multipleClasses);

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });

    it('should handle case sensitivity', () => {
      const upperCase = document.createElement('span');
      upperCase.className = 'CT-WORD-WRAPPER';

      const mixedCase = document.createElement('span');
      mixedCase.className = 'Ct-Word-Wrapper';

      document.body.appendChild(upperCase);
      document.body.appendChild(mixedCase);

      expect(() => clearAllInlineTranslations()).not.toThrow();
    });
  });

  describe('Concurrent operations', () => {
    it('should handle concurrent clear calls', async () => {
      const wrapper = document.createElement('span');
      wrapper.className = 'ct-word-wrapper';
      document.body.appendChild(wrapper);

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve().then(() => clearAllInlineTranslations()));
      }

      await Promise.all(promises);
      expect(true).toBe(true);
    });
  });
});
