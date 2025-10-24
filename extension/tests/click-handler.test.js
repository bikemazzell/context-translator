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
      // Check listener count to ensure no leaks
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

  describe('Click event handling', () => {
    let mockDependencies;
    let clickEvent;

    beforeEach(() => {
      document.body.innerHTML = '<div id="content">Test content</div>';

      mockDependencies = {
        settingsManager: {
          get: jest.fn().mockReturnValue(200)
        },
        getSelection: jest.fn(),
        extractWordAtPointFn: jest.fn(),
        extractContextFn: jest.fn(),
        extractContextFromRangeFn: jest.fn(),
        document: document
      };

      clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 200
      });
      Object.defineProperty(clickEvent, 'target', {
        value: document.getElementById('content'),
        writable: false
      });
    });

    afterEach(() => {
      detachClickHandler();
    });

    it('should prevent default and stop propagation for normal clicks', () => {
      const callback = jest.fn();
      mockDependencies.getSelection.mockReturnValue({
        toString: () => '',
        rangeCount: 0
      });
      mockDependencies.extractWordAtPointFn.mockReturnValue(null);

      attachClickHandler(callback, mockDependencies);

      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');

      document.getElementById('content').dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();

      preventDefaultSpy.mockRestore();
      stopPropagationSpy.mockRestore();
    });

    it('should not handle clicks on toolbar', () => {
      document.body.innerHTML = '<div id="ct-toolbar"><button id="btn">Test</button></div>';
      const button = document.getElementById('btn');
      const callback = jest.fn();

      const toolbarClickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(toolbarClickEvent, 'target', {
        value: button,
        writable: false
      });

      attachClickHandler(callback, mockDependencies);
      button.dispatchEvent(toolbarClickEvent);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not handle clicks on inline translations', () => {
      document.body.innerHTML = '<div class="ct-inline-translation"><span id="span">Test</span></div>';
      const span = document.getElementById('span');
      const callback = jest.fn();

      const inlineClickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(inlineClickEvent, 'target', {
        value: span,
        writable: false
      });

      attachClickHandler(callback, mockDependencies);
      span.dispatchEvent(inlineClickEvent);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not handle clicks on translation popup', () => {
      document.body.innerHTML = '<div id="ct-translation-popup"><p id="para">Test</p></div>';
      const para = document.getElementById('para');
      const callback = jest.fn();

      const popupClickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(popupClickEvent, 'target', {
        value: para,
        writable: false
      });

      attachClickHandler(callback, mockDependencies);
      para.dispatchEvent(popupClickEvent);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should prevent default for word wrapper clicks but not call callback', () => {
      document.body.innerHTML = '<span class="ct-word-wrapper" id="wrapper">Test</span>';
      const wrapper = document.getElementById('wrapper');
      const callback = jest.fn();

      const wrapperClickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(wrapperClickEvent, 'target', {
        value: wrapper,
        writable: false
      });

      attachClickHandler(callback, mockDependencies);

      const preventDefaultSpy = jest.spyOn(wrapperClickEvent, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(wrapperClickEvent, 'stopPropagation');

      wrapper.dispatchEvent(wrapperClickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();

      preventDefaultSpy.mockRestore();
      stopPropagationSpy.mockRestore();
    });

    it('should handle selected text translation', async () => {
      const mockRange = { start: 0, end: 5 };
      const mockSelection = {
        toString: () => 'hello',
        rangeCount: 1,
        getRangeAt: () => mockRange
      };

      mockDependencies.getSelection.mockReturnValue(mockSelection);
      mockDependencies.extractContextFromRangeFn.mockReturnValue('context text');

      const callback = jest.fn().mockResolvedValue(undefined);

      attachClickHandler(callback, mockDependencies);
      await document.getElementById('content').dispatchEvent(clickEvent);

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(
        'hello',
        'context text',
        mockRange,
        100,
        200
      );
    });

    it('should handle word at point translation when no selection', async () => {
      const mockNode = { nodeType: 3 };
      const mockRange = { start: 0, end: 5 };

      mockDependencies.getSelection.mockReturnValue({
        toString: () => '',
        rangeCount: 0
      });
      mockDependencies.extractWordAtPointFn.mockReturnValue({
        text: 'world',
        node: mockNode,
        range: mockRange
      });
      mockDependencies.extractContextFn.mockReturnValue('point context');

      const callback = jest.fn().mockResolvedValue(undefined);

      attachClickHandler(callback, mockDependencies);
      await document.getElementById('content').dispatchEvent(clickEvent);

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDependencies.extractWordAtPointFn).toHaveBeenCalledWith(100, 200);
      expect(callback).toHaveBeenCalledWith(
        'world',
        'point context',
        mockRange,
        100,
        200
      );
    });

    it('should use context window size from settings', async () => {
      mockDependencies.settingsManager.get.mockReturnValue(500);
      mockDependencies.getSelection.mockReturnValue({
        toString: () => 'test',
        rangeCount: 1,
        getRangeAt: () => ({})
      });
      mockDependencies.extractContextFromRangeFn.mockReturnValue('context');

      const callback = jest.fn().mockResolvedValue(undefined);

      attachClickHandler(callback, mockDependencies);
      await document.getElementById('content').dispatchEvent(clickEvent);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDependencies.settingsManager.get).toHaveBeenCalledWith('contextWindowChars');
      expect(mockDependencies.extractContextFromRangeFn).toHaveBeenCalledWith(expect.anything(), 500);
    });

    it('should use default context window size when setting not available', async () => {
      mockDependencies.settingsManager.get.mockReturnValue(null);
      mockDependencies.getSelection.mockReturnValue({
        toString: () => 'test',
        rangeCount: 1,
        getRangeAt: () => ({})
      });
      mockDependencies.extractContextFromRangeFn.mockReturnValue('context');

      const callback = jest.fn().mockResolvedValue(undefined);

      attachClickHandler(callback, mockDependencies);
      await document.getElementById('content').dispatchEvent(clickEvent);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDependencies.extractContextFromRangeFn).toHaveBeenCalledWith(expect.anything(), 200);
    });

    it('should not call callback when no selection and no word at point', async () => {
      mockDependencies.getSelection.mockReturnValue({
        toString: () => '',
        rangeCount: 0
      });
      mockDependencies.extractWordAtPointFn.mockReturnValue(null);

      const callback = jest.fn();

      attachClickHandler(callback, mockDependencies);
      await document.getElementById('content').dispatchEvent(clickEvent);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not call callback when handler is inactive', async () => {
      const callback = jest.fn();

      attachClickHandler(callback, mockDependencies);
      detachClickHandler();

      await document.getElementById('content').dispatchEvent(clickEvent);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', async () => {
      mockDependencies.getSelection.mockReturnValue({
        toString: () => 'test',
        rangeCount: 1,
        getRangeAt: () => ({})
      });
      mockDependencies.extractContextFromRangeFn.mockReturnValue('context');

      const callback = jest.fn().mockRejectedValue(new Error('Callback error'));

      attachClickHandler(callback, mockDependencies);

      // Trigger the click event - the error should not propagate
      document.getElementById('content').dispatchEvent(clickEvent);

      // Wait for async handler and catch any unhandled rejections
      await new Promise(resolve => setTimeout(resolve, 20));

      // Callback should have been called even though it threw
      expect(callback).toHaveBeenCalled();
    });

    it('should pass correct coordinates to callback', async () => {
      const mockRange = { start: 0, end: 5 };
      mockDependencies.getSelection.mockReturnValue({
        toString: () => 'test',
        rangeCount: 1,
        getRangeAt: () => mockRange
      });
      mockDependencies.extractContextFromRangeFn.mockReturnValue('context');

      const callback = jest.fn().mockResolvedValue(undefined);

      const customClickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 456,
        clientY: 789
      });
      Object.defineProperty(customClickEvent, 'target', {
        value: document.getElementById('content'),
        writable: false
      });

      attachClickHandler(callback, mockDependencies);
      await document.getElementById('content').dispatchEvent(customClickEvent);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(
        'test',
        'context',
        mockRange,
        456,
        789
      );
    });

    it('should catch and log errors from callback without crashing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      document.body.innerHTML = '<div id="content">Test word here</div>';
      mockDependencies.getSelection.mockReturnValue({
        toString: () => 'test',
        rangeCount: 1,
        getRangeAt: () => ({})
      });
      mockDependencies.extractContextFromRangeFn.mockReturnValue('context');

      const testError = new Error('Callback failed');
      // Make callback throw synchronously
      const callback = jest.fn().mockImplementation(() => {
        throw testError;
      });

      attachClickHandler(callback, mockDependencies);

      // Trigger the click event - should not throw
      expect(() => {
        document.getElementById('content').dispatchEvent(clickEvent);
      }).not.toThrow();

      await new Promise(resolve => setTimeout(resolve, 50));

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should use default settings when no settingsManager provided', async () => {
      document.body.innerHTML = '<div id="content">Test word here</div>';

      // Create dependencies without settingsManager
      const depsWithoutSettings = {
        getSelection: jest.fn(() => ({
          toString: () => 'test',
          rangeCount: 1,
          getRangeAt: () => ({})
        })),
        extractWordAtPointFn: jest.fn(() => null),
        extractContextFn: jest.fn(() => 'context'),
        extractContextFromRangeFn: jest.fn(() => 'context from range'),
        document: document
      };

      const callback = jest.fn();

      attachClickHandler(callback, depsWithoutSettings);

      document.getElementById('content').dispatchEvent(clickEvent);

      await new Promise(resolve => setTimeout(resolve, 20));

      // Should use default context window of 200
      expect(depsWithoutSettings.extractContextFromRangeFn).toHaveBeenCalledWith(
        expect.anything(),
        200
      );
    });
  });
});
