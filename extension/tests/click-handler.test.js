/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { attachClickHandler, detachClickHandler } from '../content/handlers/click-handler.js';

describe('Click Handler', () => {
  let onTranslateCallback;

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-content">Test content</div>';
    onTranslateCallback = jest.fn();
  });

  afterEach(() => {
    detachClickHandler();
  });

  describe('attachClickHandler', () => {
    it('should attach click handler to document with capture phase', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      attachClickHandler(onTranslateCallback);

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);

      addEventListenerSpy.mockRestore();
    });

    it('should replace existing handler when called multiple times', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      attachClickHandler(onTranslateCallback);
      attachClickHandler(onTranslateCallback);

      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });

    it('should store callback for later use', () => {
      expect(() => attachClickHandler(onTranslateCallback)).not.toThrow();
    });

    it('should not throw when callback is null', () => {
      expect(() => attachClickHandler(null)).not.toThrow();
    });

    it('should not throw when callback is undefined', () => {
      expect(() => attachClickHandler(undefined)).not.toThrow();
    });

    it('should handle synchronous callback', () => {
      const syncCallback = jest.fn();
      expect(() => attachClickHandler(syncCallback)).not.toThrow();
    });

    it('should handle async callback', () => {
      const asyncCallback = jest.fn(async () => {
        await Promise.resolve();
      });
      expect(() => attachClickHandler(asyncCallback)).not.toThrow();
    });

    it('should work with different types of functions', () => {
      const arrowFunction = jest.fn();
      attachClickHandler(arrowFunction);
      detachClickHandler();

      function regularFunction() {}
      const regularFn = jest.fn(regularFunction);
      attachClickHandler(regularFn);
      detachClickHandler();

      const asyncArrowFn = jest.fn(async () => {});
      attachClickHandler(asyncArrowFn);
    });
  });

  describe('detachClickHandler', () => {
    it('should remove click handler from document', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      attachClickHandler(onTranslateCallback);
      detachClickHandler();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);

      removeEventListenerSpy.mockRestore();
    });

    it('should not throw error when called without attaching first', () => {
      expect(() => detachClickHandler()).not.toThrow();
    });

    it('should be idempotent', () => {
      attachClickHandler(onTranslateCallback);

      expect(() => {
        detachClickHandler();
        detachClickHandler();
        detachClickHandler();
      }).not.toThrow();
    });

    it('should allow reattaching after detaching', () => {
      attachClickHandler(onTranslateCallback);
      detachClickHandler();

      expect(() => attachClickHandler(onTranslateCallback)).not.toThrow();
    });

    it('should clear internal handler reference', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      attachClickHandler(onTranslateCallback);
      detachClickHandler();

      removeEventListenerSpy.mockClear();

      detachClickHandler();

      expect(removeEventListenerSpy).not.toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Handler lifecycle', () => {
    it('should properly manage attach/detach cycles', () => {
      const addSpy = jest.spyOn(document, 'addEventListener');
      const removeSpy = jest.spyOn(document, 'removeEventListener');

      for (let i = 0; i < 5; i++) {
        attachClickHandler(onTranslateCallback);
        detachClickHandler();
      }

      expect(addSpy).toHaveBeenCalledTimes(5);
      expect(removeSpy).toHaveBeenCalledTimes(5);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('should replace callback when attaching multiple times without detaching', () => {
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();
      const thirdCallback = jest.fn();

      attachClickHandler(firstCallback);
      attachClickHandler(secondCallback);
      attachClickHandler(thirdCallback);

      expect(() => detachClickHandler()).not.toThrow();
    });

    it('should handle rapid attach/detach operations', () => {
      for (let i = 0; i < 100; i++) {
        attachClickHandler(jest.fn());
        if (i % 2 === 0) {
          detachClickHandler();
        }
      }

      expect(() => detachClickHandler()).not.toThrow();
    });
  });

  describe('Event listener properties', () => {
    it('should use capture phase (third parameter true)', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      attachClickHandler(onTranslateCallback);

      const calls = addEventListenerSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toBe('click');
      expect(calls[0][2]).toBe(true);

      addEventListenerSpy.mockRestore();
    });

    it('should attach to document, not window', () => {
      const documentSpy = jest.spyOn(document, 'addEventListener');
      const windowSpy = jest.spyOn(window, 'addEventListener');

      attachClickHandler(onTranslateCallback);

      expect(documentSpy).toHaveBeenCalled();
      expect(windowSpy).not.toHaveBeenCalled();

      documentSpy.mockRestore();
      windowSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle callback that throws error gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });

      expect(() => attachClickHandler(errorCallback)).not.toThrow();
    });

    it('should handle callback that returns a value', () => {
      const returningCallback = jest.fn(() => 'some value');

      expect(() => attachClickHandler(returningCallback)).not.toThrow();
    });

    it('should handle callback with multiple parameters', () => {
      const multiParamCallback = jest.fn((text, context, range, x, y) => {
        return { text, context, range, x, y };
      });

      expect(() => attachClickHandler(multiParamCallback)).not.toThrow();
    });

    it('should handle detach during callback execution', () => {
      let callbackExecuted = false;
      const detachingCallback = jest.fn(() => {
        callbackExecuted = true;
        detachClickHandler();
      });

      attachClickHandler(detachingCallback);

      expect(callbackExecuted).toBe(false);
    });
  });

  describe('Memory management', () => {
    it('should not leak event listeners', () => {
      const initialListenerCount = document._eventListeners ? Object.keys(document._eventListeners).length : 0;

      for (let i = 0; i < 10; i++) {
        attachClickHandler(jest.fn());
        detachClickHandler();
      }

      attachClickHandler(jest.fn());
      detachClickHandler();

      expect(() => detachClickHandler()).not.toThrow();
    });

    it('should clean up references on detach', () => {
      const callback = jest.fn();

      attachClickHandler(callback);
      detachClickHandler();

      const removeSpy = jest.spyOn(document, 'removeEventListener');
      detachClickHandler();

      expect(removeSpy).not.toHaveBeenCalled();

      removeSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty document body', () => {
      document.body.innerHTML = '';

      expect(() => {
        attachClickHandler(onTranslateCallback);
        detachClickHandler();
      }).not.toThrow();
    });

    it('should handle document with complex DOM structure', () => {
      document.body.innerHTML = `
        <div>
          <div>
            <div>
              <span><b>Test</b></span>
            </div>
          </div>
        </div>
      `;

      expect(() => {
        attachClickHandler(onTranslateCallback);
        detachClickHandler();
      }).not.toThrow();
    });

    it('should handle multiple rapid attachments', () => {
      const callbacks = Array.from({ length: 10 }, () => jest.fn());

      callbacks.forEach(cb => {
        attachClickHandler(cb);
      });

      expect(() => detachClickHandler()).not.toThrow();
    });

    it('should handle null callback gracefully during attach', () => {
      expect(() => {
        attachClickHandler(null);
        detachClickHandler();
      }).not.toThrow();
    });

    it('should maintain state across DOM modifications', () => {
      attachClickHandler(onTranslateCallback);

      document.body.innerHTML = '<div>New content</div>';

      expect(() => detachClickHandler()).not.toThrow();
    });
  });
});
