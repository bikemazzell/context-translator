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

  beforeEach(() => {
    // Suppress console output
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

    // Mock global Node constants (browser DOM API)
    global.Node = {
      TEXT_NODE: 3,
      ELEMENT_NODE: 1
    };

    // Mock NodeFilter constants
    global.NodeFilter = {
      SHOW_TEXT: 4
    };
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    delete global.Node;
    delete global.NodeFilter;
    delete global.document;
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

    beforeEach(() => {
      // Create mock text node
      mockTextNode = {
        nodeType: 3, // TEXT_NODE
        textContent: 'Hello world test'
      };

      // Create mock range
      mockRange = {
        startContainer: mockTextNode,
        startOffset: 3 // middle of "Hello"
      };

      // Mock document.caretRangeFromPoint
      global.document = {
        caretRangeFromPoint: jest.fn().mockReturnValue(mockRange),
        createRange: jest.fn().mockReturnValue({
          setStart: jest.fn(),
          setEnd: jest.fn()
        })
      };
    });

    afterEach(() => {
      delete global.document;
    });

    test('should extract word at point using caretRangeFromPoint', () => {
      const result = extractWordAtPoint(100, 200);

      expect(document.caretRangeFromPoint).toHaveBeenCalledWith(100, 200);
      expect(result).toBeDefined();
      expect(result.text).toBe('Hello');
      expect(result.node).toBe(mockTextNode);
      expect(result.range).toBeDefined();
    });

    test('should return null if caretRangeFromPoint returns null', () => {
      document.caretRangeFromPoint.mockReturnValue(null);

      const result = extractWordAtPoint(100, 200);

      expect(result).toBeNull();
    });

    test('should return null if node is null', () => {
      mockRange.startContainer = null;

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

      delete document.caretRangeFromPoint;
      document.caretPositionFromPoint = jest.fn().mockReturnValue(mockPosition);

      const result = extractWordAtPoint(100, 200);

      expect(document.caretPositionFromPoint).toHaveBeenCalledWith(100, 200);
      expect(result).toBeDefined();
      expect(result.text).toBe('Hello');
    });

    test('should return null if caretPositionFromPoint returns null', () => {
      delete document.caretRangeFromPoint;
      document.caretPositionFromPoint = jest.fn().mockReturnValue(null);

      const result = extractWordAtPoint(100, 200);

      expect(result).toBeNull();
    });

    test('should return null if no API available', () => {
      delete document.caretRangeFromPoint;

      const result = extractWordAtPoint(100, 200);

      expect(result).toBeNull();
    });

    test('should create proper range for extracted word', () => {
      const mockCreatedRange = {
        setStart: jest.fn(),
        setEnd: jest.fn()
      };
      document.createRange.mockReturnValue(mockCreatedRange);

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
      // Create mock text node
      mockTextNode = {
        nodeType: 3, // TEXT_NODE
        textContent: 'target word',
        parentElement: null
      };

      // Create mock element with substantial text
      mockElement = {
        tagName: 'P',
        textContent: 'This is some context before the target word and some context after it.',
        innerText: 'This is some context before the target word and some context after it.',
        parentElement: null
      };

      mockTextNode.parentElement = mockElement;
    });

    test('should extract context centered around text node', () => {
      const result = extractContext(mockTextNode, 40);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(60); // Some tolerance for window calculations
      expect(result).toContain('target word');
    });

    test('should normalize whitespace in context', () => {
      mockElement.textContent = 'Text with\n\nmultiple\t\twhitespace   characters';

      const result = extractContext(mockTextNode, 100);

      expect(result).not.toContain('\n');
      expect(result).not.toContain('\t');
      expect(result).not.toMatch(/\s{2,}/); // no multiple spaces
    });

    test('should strip emojis and special characters from context', () => {
      // Make text long enough to meet window size requirements (>= windowSize * 1.5 = 75)
      mockElement.textContent = 'Discussion 💬 Stanje podjetništva! (old.reddit.com) submitted 10 hours ago by user in Slovenia about business conditions';
      mockTextNode.textContent = 'Stanje'; // Must be in parent element's text

      const result = extractContext(mockTextNode, 50); // Reduced window size

      expect(result).not.toContain('💬');
      expect(result).not.toContain('!');
      expect(result).not.toContain('(');
      expect(result).not.toContain(')');
      expect(result).toContain('Discussion');
      expect(result).toContain('Stanje');
      expect(result).toContain('podjetništva');
    });

    test('should walk up DOM tree to find sufficient text', () => {
      const smallElement = {
        tagName: 'SPAN',
        textContent: 'word',
        innerText: 'word',
        parentElement: mockElement
      };

      mockTextNode.parentElement = smallElement;

      const result = extractContext(mockTextNode, 40);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(10); // should get parent's text
    });

    test('should handle element node input', () => {
      // Create mock element node with TreeWalker
      const mockElementInput = {
        nodeType: 1, // ELEMENT_NODE
        parentElement: mockElement
      };

      global.document = {
        createTreeWalker: jest.fn().mockReturnValue({
          nextNode: jest.fn().mockReturnValue(mockTextNode)
        })
      };

      const result = extractContext(mockElementInput, 40);

      expect(result).toBeDefined();
      expect(document.createTreeWalker).toHaveBeenCalled();
    });

    test('should return empty string if no text node found', () => {
      const mockElementInput = {
        nodeType: 1, // ELEMENT_NODE
        parentElement: null
      };

      global.document = {
        createTreeWalker: jest.fn().mockReturnValue({
          nextNode: jest.fn().mockReturnValue(null)
        })
      };

      const result = extractContext(mockElementInput, 40);

      expect(result).toBe('');
    });

    test('should return partial text if no parent element', () => {
      mockTextNode.parentElement = null;

      const result = extractContext(mockTextNode, 40);

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
      mockElement.textContent = 'START ' + 'padding '.repeat(10) + 'target word' + ' padding'.repeat(10) + ' END';

      const result = extractContext(mockTextNode, 40);

      // Should have text before and after
      expect(result).toBeDefined();
      expect(result).toContain('target word');
    });

    test('should fallback when text node content not found in parent', () => {
      // Create a scenario where text node content doesn't match parent's indexOf
      mockTextNode.textContent = 'unique-text';
      mockElement.textContent = 'completely-different-text';

      const result = extractContext(mockTextNode, 50);

      // Should return partial text (line 117)
      expect(result).toBeDefined();
      expect(consoleDebugSpy).toHaveBeenCalled();
    });
  });

  describe('extractContextFromRange', () => {
    let mockRange;
    let mockContainer;
    let mockElement;

    beforeEach(() => {
      mockContainer = {
        nodeType: 3, // TEXT_NODE
        parentElement: null
      };

      mockElement = {
        tagName: 'P',
        textContent: 'This is some context before the selected text and some context after it.',
        innerText: 'This is some context before the selected text and some context after it.',
        parentElement: null
      };

      mockContainer.parentElement = mockElement;

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
      mockElement.textContent = 'Context\n\nwith\t\tmultiple   spaces and selected text here';
      mockRange.toString.mockReturnValue('selected text');

      const result = extractContextFromRange(mockRange, 100);

      expect(result).not.toContain('\n');
      expect(result).not.toContain('\t');
      expect(result).not.toMatch(/\s{2,}/);
    });

    test('should handle element container', () => {
      mockRange.commonAncestorContainer = mockElement;
      mockRange.commonAncestorContainer.nodeType = 1; // ELEMENT_NODE

      const result = extractContextFromRange(mockRange, 40);

      expect(result).toBeDefined();
      expect(result).toContain('selected text');
    });

    test('should walk up DOM tree for sufficient text', () => {
      const smallElement = {
        tagName: 'SPAN',
        textContent: 'selected text',
        innerText: 'selected text',
        parentElement: mockElement
      };

      mockContainer.parentElement = smallElement;

      const result = extractContextFromRange(mockRange, 40);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(13); // more than just "selected text"
    });

    test('should return empty string if no element found', () => {
      mockContainer.parentElement = null;

      const result = extractContextFromRange(mockRange, 40);

      expect(result).toBe('');
    });

    test('should return fallback text when selection not found', () => {
      // Uses default mockRange and mockElement from beforeEach
      mockRange.toString.mockReturnValue('NOT FOUND TEXT');

      const result = extractContextFromRange(mockRange, 40);

      // Returns fallback text (first part of content)
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    test('should trim result', () => {
      mockElement.textContent = '   selected text   ';
      mockRange.toString.mockReturnValue('selected text');

      const result = extractContextFromRange(mockRange, 100);

      expect(result).not.toMatch(/^\s/);
      expect(result).not.toMatch(/\s$/);
    });
  });
});
