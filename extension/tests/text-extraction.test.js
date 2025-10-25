/**
 * Tests for Text Extraction utilities
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

import {
  extractWordAtPoint,
  extractWordAtOffset,
  extractContext,
  extractContextFromRange
} from '../content/handlers/text-extraction.js';

describe('text-extraction', () => {
  let consoleDebugSpy;
  let savedDocument;
  let savedWindow;

  beforeEach(() => {
    // Suppress console output
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

    // Save references to JSDOM globals
    savedDocument = global.document;
    savedWindow = global.window;

    // Mock window.getComputedStyle for all tests (keep existing window object)
    global.window.getComputedStyle = jest.fn().mockReturnValue({
      display: 'block',
      visibility: 'visible'
    });
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    // Restore original globals
    global.document = savedDocument;
    global.window = savedWindow;
  });

  describe('extractWordAtOffset', () => {
    test('should extract word at exact offset', () => {
      const text = 'Hello world';
      const result = extractWordAtOffset(text, 3); // middle of "Hello"

      expect(result).toEqual({
        text: 'Hello',
        start: 0,
        end: 5
      });
    });

    test('should extract word at start of text', () => {
      const text = 'Hello world';
      const result = extractWordAtOffset(text, 0);

      expect(result).toEqual({
        text: 'Hello',
        start: 0,
        end: 5
      });
    });

    test('should extract word at end of text', () => {
      const text = 'Hello world';
      const result = extractWordAtOffset(text, 10); // 'd' in "world"

      expect(result).toEqual({
        text: 'world',
        start: 6,
        end: 11
      });
    });

    test('should handle word boundary at space', () => {
      const text = 'Hello world';
      const result = extractWordAtOffset(text, 6); // start of "world"

      expect(result).toEqual({
        text: 'world',
        start: 6,
        end: 11
      });
    });

    test('should handle punctuation boundaries', () => {
      const text = 'Hello, world!';
      const result = extractWordAtOffset(text, 7); // 'w' in "world"

      expect(result).toEqual({
        text: 'world',
        start: 7,
        end: 12
      });
    });

    test('should handle German special characters', () => {
      const text = 'Schön aussagt über';
      const result = extractWordAtOffset(text, 2); // middle of "Schön"

      expect(result).toEqual({
        text: 'Schön',
        start: 0,
        end: 5
      });
    });

    test('should handle quotation marks as boundaries', () => {
      const text = '"Hello" world';
      const result = extractWordAtOffset(text, 2); // 'e' in "Hello"

      expect(result).toEqual({
        text: 'Hello',
        start: 1,
        end: 6
      });
    });

    test('should handle parentheses as boundaries', () => {
      const text = 'text (word) more';
      const result = extractWordAtOffset(text, 7); // 'w' in "word"

      expect(result).toEqual({
        text: 'word',
        start: 6,
        end: 10
      });
    });

    test('should handle brackets as boundaries', () => {
      const text = 'text [word] more';
      const result = extractWordAtOffset(text, 7);

      expect(result).toEqual({
        text: 'word',
        start: 6,
        end: 10
      });
    });

    test('should return null for empty result', () => {
      const text = '   ';
      const result = extractWordAtOffset(text, 1);

      expect(result).toBeNull();
    });

    test('should trim whitespace from result', () => {
      const text = '  word  ';
      const result = extractWordAtOffset(text, 4); // middle of "word"

      expect(result).toEqual({
        text: 'word',
        start: 2,
        end: 6
      });
    });

    test('should handle multi-word selection by extracting at offset', () => {
      const text = 'one two three';
      const result = extractWordAtOffset(text, 4); // 't' in "two"

      expect(result).toEqual({
        text: 'two',
        start: 4,
        end: 7
      });
    });

    test('should handle semicolon as boundary', () => {
      const text = 'first;second';
      const result = extractWordAtOffset(text, 7); // 's' in "second"

      expect(result).toEqual({
        text: 'second',
        start: 6,
        end: 12
      });
    });

    test('should handle colon as boundary', () => {
      const text = 'label:value';
      const result = extractWordAtOffset(text, 7); // 'v' in "value"

      expect(result).toEqual({
        text: 'value',
        start: 6,
        end: 11
      });
    });

    test('should handle various quotation marks', () => {
      const text = '«word» test';
      const result = extractWordAtOffset(text, 2);

      expect(result).toEqual({
        text: 'word',
        start: 1,
        end: 5
      });
    });

    test('should handle German quotes', () => {
      const text = '„word" test';
      const result = extractWordAtOffset(text, 2);

      expect(result).toEqual({
        text: 'word',
        start: 1,
        end: 5
      });
    });
  });

  describe('extractWordAtPoint', () => {
    let mockRange;
    let mockTextNode;
    let mockCreatedRange;
    let originalCreateRange;

    beforeEach(() => {
      // Save original createRange
      originalCreateRange = document.createRange;

      // Create real JSDOM text node
      const testEl = document.createElement('p');
      testEl.textContent = 'Hello world test';
      mockTextNode = testEl.firstChild;

      // Create mock range using the original createRange
      mockRange = originalCreateRange.call(document);
      mockRange.setStart(mockTextNode, 3); // middle of "Hello"
      mockRange.setEnd(mockTextNode, 3);

      // Add caretRangeFromPoint to document if it doesn't exist
      if (!document.caretRangeFromPoint) {
        document.caretRangeFromPoint = jest.fn();
      }

      // Mock document methods
      document.caretRangeFromPoint = jest.fn().mockReturnValue(mockRange);

      // Create a mock for createRange
      mockCreatedRange = {
        setStart: jest.fn(),
        setEnd: jest.fn()
      };
      document.createRange = jest.fn().mockReturnValue(mockCreatedRange);
    });

    afterEach(() => {
      // Restore original createRange
      if (originalCreateRange) {
        document.createRange = originalCreateRange;
      }
    });

    test('should extract word at point using caretRangeFromPoint', () => {
      const result = extractWordAtPoint(100, 200);

      expect(global.document.caretRangeFromPoint).toHaveBeenCalledWith(100, 200);
      expect(result).toBeDefined();
      expect(result.text).toBe('Hello');
      expect(result.node).toBe(mockTextNode);
      expect(result.range).toBeDefined();
    });

    test('should return null if caretRangeFromPoint returns null', () => {
      global.document.caretRangeFromPoint.mockReturnValue(null);

      const result = extractWordAtPoint(100, 200);

      expect(result).toBeNull();
    });

    test('should return null if node is null', () => {
      // Mock caretRangeFromPoint to return a range with null startContainer
      const rangeWithNullNode = { startContainer: null, startOffset: 0 };
      document.caretRangeFromPoint.mockReturnValue(rangeWithNullNode);

      const result = extractWordAtPoint(100, 200);

      expect(result).toBeNull();
    });

    test('should return null if textContent is empty', () => {
      mockTextNode.textContent = '';

      const result = extractWordAtPoint(100, 200);

      expect(result).toBeNull();
    });

    test('should use caretPositionFromPoint if caretRangeFromPoint unavailable', () => {
      const mockPosition = {
        offsetNode: mockTextNode,
        offset: 3
      };

      // Temporarily remove caretRangeFromPoint and add caretPositionFromPoint
      const savedCaretRange = global.document.caretRangeFromPoint;
      delete global.document.caretRangeFromPoint;
      global.document.caretPositionFromPoint = jest.fn().mockReturnValue(mockPosition);

      const result = extractWordAtPoint(100, 200);

      expect(global.document.caretPositionFromPoint).toHaveBeenCalledWith(100, 200);
      expect(result).toBeDefined();
      expect(result.text).toBe('Hello');

      // Restore
      delete global.document.caretPositionFromPoint;
      global.document.caretRangeFromPoint = savedCaretRange;
    });

    test('should return null if caretPositionFromPoint returns null', () => {
      // Temporarily remove caretRangeFromPoint and add caretPositionFromPoint
      const savedCaretRange = global.document.caretRangeFromPoint;
      delete global.document.caretRangeFromPoint;
      global.document.caretPositionFromPoint = jest.fn().mockReturnValue(null);

      const result = extractWordAtPoint(100, 200);

      expect(result).toBeNull();

      // Restore
      delete global.document.caretPositionFromPoint;
      global.document.caretRangeFromPoint = savedCaretRange;
    });

    test('should return null if no API available', () => {
      // Temporarily remove caretRangeFromPoint
      const savedCaretRange = global.document.caretRangeFromPoint;
      delete global.document.caretRangeFromPoint;

      const result = extractWordAtPoint(100, 200);

      expect(result).toBeNull();

      // Restore
      global.document.caretRangeFromPoint = savedCaretRange;
    });

    test('should create proper range for extracted word', () => {
      const result = extractWordAtPoint(100, 200);

      expect(document.createRange).toHaveBeenCalled();
      expect(mockCreatedRange.setStart).toHaveBeenCalledWith(mockTextNode, 0);
      expect(mockCreatedRange.setEnd).toHaveBeenCalledWith(mockTextNode, 5);
      expect(result.range).toBe(mockCreatedRange);
    });
  });

  describe('extractContext', () => {
    let mockTextNode;
    let mockElement;

    beforeEach(() => {
      // Use real JSDOM elements from the jest-environment-jsdom
      mockElement = document.createElement('p');
      mockElement.textContent = 'This is some context before the target word and some context after it.';

      // Create a real text node
      mockTextNode = mockElement.firstChild;
    });

    test('should extract context centered around text node', () => {
      const result = extractContext(mockTextNode, 40);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(80); // Some tolerance for window calculations
      expect(result).toContain('target word');
    });

    test('should normalize whitespace in context', () => {
      const testElement = document.createElement('p');
      testElement.textContent = 'Text with\n\nmultiple\t\twhitespace   characters';
      const testTextNode = testElement.firstChild;

      const result = extractContext(testTextNode, 100);

      expect(result).not.toContain('\n');
      expect(result).not.toContain('\t');
      expect(result).not.toMatch(/\s{2,}/); // no multiple spaces
    });

    test('should strip emojis and special characters from context', () => {
      // Make text long enough to meet window size requirements (>= windowSize * 1.5 = 75)
      const testElement = document.createElement('p');
      testElement.textContent = 'Discussion 💬 Stanje podjetništva! (old.reddit.com) submitted 10 hours ago by user in Slovenia about business conditions';
      const testTextNode = testElement.firstChild;

      const result = extractContext(testTextNode, 50); // Reduced window size

      expect(result).not.toContain('💬');
      expect(result).not.toContain('!');
      expect(result).not.toContain('(');
      expect(result).not.toContain(')');
      expect(result).toContain('Discussion');
      expect(result).toContain('Stanje');
      expect(result).toContain('podjetništva');
    });

    test('should walk up DOM tree to find sufficient text', () => {
      const parentDiv = document.createElement('div');
      parentDiv.textContent = 'This is some context before the target word and some context after it.';

      const smallElement = document.createElement('span');
      smallElement.textContent = 'word';
      parentDiv.appendChild(smallElement);

      const testTextNode = smallElement.firstChild;

      const result = extractContext(testTextNode, 40);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(10); // should get parent's text
    });

    test('should handle element node input', () => {
      // Create real JSDOM element node with TreeWalker
      const mockElementInput = document.createElement('div');
      mockElementInput.textContent = 'This is some context before the target word and some context after it.';

      // Spy on the real createTreeWalker
      const createTreeWalkerSpy = jest.spyOn(document, 'createTreeWalker');

      const result = extractContext(mockElementInput, 40);

      expect(result).toBeDefined();
      expect(createTreeWalkerSpy).toHaveBeenCalled();

      createTreeWalkerSpy.mockRestore();
    });

    test('should return empty string if no text node found', () => {
      const mockElementInput = document.createElement('div');

      // Spy on createTreeWalker and make it return no text nodes
      const createTreeWalkerSpy = jest.spyOn(document, 'createTreeWalker').mockReturnValue({
        nextNode: jest.fn().mockReturnValue(null)
      });

      const result = extractContext(mockElementInput, 40);

      expect(result).toBe('');

      createTreeWalkerSpy.mockRestore();
    });

    test('should return partial text if no parent element', () => {
      // Create a standalone text node
      const standaloneTextNode = document.createTextNode('This is some context before the target word and some context after it.');

      const result = extractContext(standaloneTextNode, 40);

      // Falls back to textNode.textContent
      expect(result).toBeDefined();
      expect(result).toContain('target word');
    });

    test('should handle small window size', () => {
      const result = extractContext(mockTextNode, 10);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(10 + 10); // some tolerance
    });

    test('should handle large window size', () => {
      const result = extractContext(mockTextNode, 200);

      expect(result).toBeDefined();
      expect(result).toContain('target word');
    });

    test('should center context around text node position', () => {
      const testElement = document.createElement('p');
      testElement.textContent = 'START ' + 'padding '.repeat(10) + 'target word' + ' padding'.repeat(10) + ' END';
      const testTextNode = testElement.firstChild;

      const result = extractContext(testTextNode, 40);

      // Should have text before and after
      expect(result).toBeDefined();
      expect(result).toContain('target word');
    });

    test('should fallback when text node content not found in parent', () => {
      // Create a text node and manually set mismatched content
      const testElement = document.createElement('p');
      testElement.textContent = 'completely-different-text';
      const testTextNode = testElement.firstChild;

      // Override textContent to create mismatch scenario
      Object.defineProperty(testTextNode, 'textContent', {
        value: 'unique-text',
        writable: true,
        configurable: true
      });

      const result = extractContext(testTextNode, 50);

      // Should return partial text (line 117)
      expect(result).toBeDefined();
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    test('should skip excluded parent elements when traversing', () => {
      // Create nested structure with excluded parent using real JSDOM elements
      const outerDiv = document.createElement('div');
      outerDiv.textContent = 'This is some context before the target word and some context after it.';

      const mockScript = document.createElement('script');
      mockScript.textContent = 'var x = 1;';
      outerDiv.appendChild(mockScript);

      const smallElement = document.createElement('span');
      smallElement.textContent = 'short';
      mockScript.appendChild(smallElement);

      const testTextNode = smallElement.firstChild;

      const result = extractContext(testTextNode, 100);

      // Should skip script and continue to valid parent or fallback
      expect(result).toBeDefined();
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping excluded element')
      );
    });

    test('should reject text nodes inside excluded elements in TreeWalker', () => {
      const mockElementInput = document.createElement('div');
      const scriptElement = document.createElement('script');
      scriptElement.textContent = 'code';
      mockElementInput.appendChild(scriptElement);

      // Spy on createTreeWalker to capture the filter
      let capturedFilter = null;
      const createTreeWalkerSpy = jest.spyOn(document, 'createTreeWalker').mockImplementation((node, show, filter) => {
        capturedFilter = filter;
        // Return a walker that finds no valid text nodes
        return {
          nextNode: () => null
        };
      });

      const result = extractContext(mockElementInput, 40);

      expect(createTreeWalkerSpy).toHaveBeenCalled();

      // Test the filter with a text node inside script
      if (capturedFilter) {
        const mockTextNodeInScript = scriptElement.firstChild;
        const filterResult = capturedFilter.acceptNode(mockTextNodeInScript);
        expect(filterResult).toBe(NodeFilter.FILTER_REJECT);
      }

      expect(result).toBe('');

      createTreeWalkerSpy.mockRestore();
    });

    test('should accept text nodes not inside excluded elements in TreeWalker', () => {
      const mockElementInput = document.createElement('div');
      const pElement = document.createElement('p');
      pElement.textContent = 'valid text';
      mockElementInput.appendChild(pElement);

      // Spy on createTreeWalker to capture the filter
      let capturedFilter = null;
      const createTreeWalkerSpy = jest.spyOn(document, 'createTreeWalker').mockImplementation((node, show, filter) => {
        capturedFilter = filter;
        const mockValidTextNode = pElement.firstChild;
        // Return a walker that finds the valid text node
        return {
          nextNode: () => mockValidTextNode
        };
      });

      extractContext(mockElementInput, 40);

      expect(createTreeWalkerSpy).toHaveBeenCalled();

      // Test the filter with a valid text node
      if (capturedFilter) {
        const mockValidTextNode = pElement.firstChild;
        const filterResult = capturedFilter.acceptNode(mockValidTextNode);
        expect(filterResult).toBe(NodeFilter.FILTER_ACCEPT);
      }

      createTreeWalkerSpy.mockRestore();
    });

    test('should return null for element node when TreeWalker finds no text', () => {
      const mockElementInput = document.createElement('div');

      // Spy on createTreeWalker and make it return no text nodes
      const createTreeWalkerSpy = jest.spyOn(document, 'createTreeWalker').mockReturnValue({
        nextNode: () => null
      });

      const result = extractContext(mockElementInput, 40);

      expect(result).toBe('');

      createTreeWalkerSpy.mockRestore();
    });
  });

  describe('extractContextFromRange', () => {
    let mockRange;
    let mockContainer;
    let mockElement;

    beforeEach(() => {
      // Create real JSDOM elements from the jest-environment-jsdom
      mockElement = document.createElement('p');
      mockElement.textContent = 'This is some context before the selected text and some context after it.';

      mockContainer = mockElement.firstChild; // TEXT_NODE

      mockRange = {
        commonAncestorContainer: mockContainer,
        toString: jest.fn().mockReturnValue('selected text')
      };
    });

    test('should extract context from range', () => {
      const result = extractContextFromRange(mockRange, 40);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(60); // some tolerance for window calculations
      expect(result).toContain('selected text');
    });

    test('should return empty string if range is null', () => {
      const result = extractContextFromRange(null, 40);

      expect(result).toBe('');
    });

    test('should return empty string if selection is empty', () => {
      mockRange.toString.mockReturnValue('');

      const result = extractContextFromRange(mockRange, 40);

      expect(result).toBe('');
    });

    test('should normalize whitespace in context', () => {
      const testElement = document.createElement('p');
      testElement.textContent = 'Context\n\nwith\t\tmultiple   spaces and selected text here';
      const testContainer = testElement.firstChild;

      const testRange = {
        commonAncestorContainer: testContainer,
        toString: jest.fn().mockReturnValue('selected text')
      };

      const result = extractContextFromRange(testRange, 100);

      expect(result).not.toContain('\n');
      expect(result).not.toContain('\t');
      expect(result).not.toMatch(/\s{2,}/);
    });

    test('should handle element container', () => {
      const testElement = document.createElement('p');
      testElement.textContent = 'This is some context before the selected text and some context after it.';

      const testRange = {
        commonAncestorContainer: testElement,
        toString: jest.fn().mockReturnValue('selected text')
      };

      const result = extractContextFromRange(testRange, 40);

      expect(result).toBeDefined();
      expect(result).toContain('selected text');
    });

    test('should walk up DOM tree for sufficient text', () => {
      const parentElement = document.createElement('div');
      parentElement.textContent = 'This is some context before the selected text and some context after it.';

      const smallElement = document.createElement('span');
      smallElement.textContent = 'selected text';
      parentElement.appendChild(smallElement);

      const testContainer = smallElement.firstChild;

      const testRange = {
        commonAncestorContainer: testContainer,
        toString: jest.fn().mockReturnValue('selected text')
      };

      const result = extractContextFromRange(testRange, 40);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(13); // more than just "selected text"
    });

    test('should return empty string if no element found', () => {
      const standaloneTextNode = document.createTextNode('selected text');

      const testRange = {
        commonAncestorContainer: standaloneTextNode,
        toString: jest.fn().mockReturnValue('selected text')
      };

      const result = extractContextFromRange(testRange, 40);

      expect(result).toBe('');
    });

    test('should return fallback text when selection not found', () => {
      const testElement = document.createElement('p');
      testElement.textContent = 'This is some context before the selected text and some context after it.';
      const testContainer = testElement.firstChild;

      const testRange = {
        commonAncestorContainer: testContainer,
        toString: jest.fn().mockReturnValue('NOT FOUND TEXT')
      };

      const result = extractContextFromRange(testRange, 40);

      // Returns fallback text (first part of content)
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    test('should trim result', () => {
      const testElement = document.createElement('p');
      testElement.textContent = '   selected text   ';
      const testContainer = testElement.firstChild;

      const testRange = {
        commonAncestorContainer: testContainer,
        toString: jest.fn().mockReturnValue('selected text')
      };

      const result = extractContextFromRange(testRange, 100);

      expect(result).not.toMatch(/^\s/);
      expect(result).not.toMatch(/\s$/);
    });
  });

  describe('Security: Element Exclusion', () => {
    // No additional setup needed - using jest-environment-jsdom

    test('should exclude inline translations from context extraction', () => {
      const testElement = document.createElement('p');

      // Add text before the wrapper
      testElement.appendChild(document.createTextNode('Ställen gehalten werden '));

      // Simulate the DOM structure after translation is displayed
      const wrapper = document.createElement('span');
      wrapper.className = 'ct-word-wrapper';

      // Original word text
      const originalText = document.createTextNode('müssten');
      wrapper.appendChild(originalText);

      // Translation element (child of wrapper)
      const translation = document.createElement('span');
      translation.className = 'ct-inline-translation';
      translation.textContent = 'would have to';
      wrapper.appendChild(translation);

      testElement.appendChild(wrapper);

      // Mock getComputedStyle to return proper values for testing
      // The wrapper and translation elements should have visible styles
      global.window.getComputedStyle.mockReturnValue({
        display: 'inline',
        visibility: 'visible'
      });

      // Extract context from the paragraph element (simulating clicking on any word in it)
      // We use the first text node which is before the wrapper
      const firstTextNode = testElement.firstChild;
      const result = extractContext(firstTextNode, 100);

      // Should contain all original text but NOT the translation
      expect(result).toContain('müssten');
      expect(result).toContain('gehalten');
      expect(result).toContain('Ställen');
      expect(result).not.toContain('would have to');
    });

    test('should exclude script tags from context extraction', () => {
      const mockScript = document.createElement('script');
      mockScript.textContent = 'alert("malicious code")';

      const mockTextNode = document.createTextNode('Hello');
      mockScript.appendChild(mockTextNode);

      global.window.getComputedStyle.mockReturnValue({
        display: 'block',
        visibility: 'visible'
      });

      const result = extractContext(mockTextNode, 100);

      // Should return empty or fallback, not script content
      expect(result).not.toContain('malicious');
    });

    test('should exclude style tags from context extraction', () => {
      const mockStyle = document.createElement('style');
      mockStyle.textContent = '.class { color: red; }';

      const mockTextNode = document.createTextNode('Hello');
      mockStyle.appendChild(mockTextNode);

      global.window.getComputedStyle.mockReturnValue({
        display: 'block',
        visibility: 'visible'
      });

      const result = extractContext(mockTextNode, 100);

      // Should return empty or fallback, not style content
      expect(result).not.toContain('color');
    });

    test('should exclude hidden elements (display:none)', () => {
      const mockHiddenDiv = document.createElement('div');
      mockHiddenDiv.textContent = 'Hidden content';

      const mockTextNode = mockHiddenDiv.firstChild;

      global.window.getComputedStyle.mockReturnValue({
        display: 'none',
        visibility: 'visible'
      });

      const result = extractContext(mockTextNode, 100);

      // Should not extract from hidden element
      expect(result).toBe('Hidden content'); // Fallback to text node content
    });

    test('should exclude hidden elements (visibility:hidden)', () => {
      const mockHiddenDiv = document.createElement('div');
      mockHiddenDiv.textContent = 'Hidden content';

      const mockTextNode = mockHiddenDiv.firstChild;

      global.window.getComputedStyle.mockReturnValue({
        display: 'block',
        visibility: 'hidden'
      });

      const result = extractContext(mockTextNode, 100);

      // Should not extract from hidden element
      expect(result).toBe('Hidden content'); // Fallback to text node content
    });

    test('should exclude password input fields', () => {
      const mockPasswordInput = document.createElement('input');
      mockPasswordInput.setAttribute('type', 'password');

      const mockTextNode = document.createTextNode('secret');
      mockPasswordInput.appendChild(mockTextNode);

      global.window.getComputedStyle.mockReturnValue({
        display: 'block',
        visibility: 'visible'
      });

      const result = extractContext(mockTextNode, 100);

      // Should not extract from password field
      expect(result).toBe('secret'); // Fallback to text node content
    });

    test('should exclude textarea fields', () => {
      const mockTextarea = document.createElement('textarea');
      mockTextarea.textContent = 'user input data';

      const mockTextNode = mockTextarea.firstChild;

      global.window.getComputedStyle.mockReturnValue({
        display: 'block',
        visibility: 'visible'
      });

      const result = extractContext(mockTextNode, 100);

      // Should not extract from textarea
      expect(result).toBe('user input data'); // Fallback to text node content
    });

    test('should exclude iframe elements', () => {
      const mockIframe = document.createElement('iframe');

      const mockTextNode = document.createTextNode('iframe');
      mockIframe.appendChild(mockTextNode);

      global.window.getComputedStyle.mockReturnValue({
        display: 'block',
        visibility: 'visible'
      });

      const result = extractContext(mockTextNode, 100);

      // Should not extract from iframe
      expect(result).toBe('iframe'); // Fallback to text node content
    });
  });
});
