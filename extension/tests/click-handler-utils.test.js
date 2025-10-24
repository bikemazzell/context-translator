/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import {
  shouldIgnoreTarget,
  isWordWrapper,
  getSelectedText,
  extractSelectionData,
  extractPointData
} from '../core/click-handler-utils.js';

describe('Click Handler Utils', () => {
  describe('shouldIgnoreTarget', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should return true for null target', () => {
      expect(shouldIgnoreTarget(null)).toBe(true);
    });

    it('should return true for undefined target', () => {
      expect(shouldIgnoreTarget(undefined)).toBe(true);
    });

    it('should return true for toolbar elements', () => {
      document.body.innerHTML = '<div id="ct-toolbar"><button>Test</button></div>';
      const button = document.querySelector('button');
      expect(shouldIgnoreTarget(button)).toBe(true);
    });

    it('should return true for inline translation elements', () => {
      document.body.innerHTML = '<div class="ct-inline-translation"><span>Test</span></div>';
      const span = document.querySelector('span');
      expect(shouldIgnoreTarget(span)).toBe(true);
    });

    it('should return true for translation popup elements', () => {
      document.body.innerHTML = '<div id="ct-translation-popup"><p>Test</p></div>';
      const p = document.querySelector('p');
      expect(shouldIgnoreTarget(p)).toBe(true);
    });

    it('should return true for word wrapper elements', () => {
      document.body.innerHTML = '<span class="ct-word-wrapper">Test</span>';
      const span = document.querySelector('span');
      expect(shouldIgnoreTarget(span)).toBe(true);
    });

    it('should return false for regular elements', () => {
      document.body.innerHTML = '<div><p>Regular content</p></div>';
      const p = document.querySelector('p');
      expect(shouldIgnoreTarget(p)).toBe(false);
    });

    it('should return true for nested toolbar elements', () => {
      document.body.innerHTML = `
        <div id="ct-toolbar">
          <div class="section">
            <button>Test</button>
          </div>
        </div>
      `;
      const button = document.querySelector('button');
      expect(shouldIgnoreTarget(button)).toBe(true);
    });

    it('should return true for deeply nested special elements', () => {
      document.body.innerHTML = `
        <div class="ct-inline-translation">
          <div><div><span>Test</span></div></div>
        </div>
      `;
      const span = document.querySelector('span');
      expect(shouldIgnoreTarget(span)).toBe(true);
    });

    it('should handle elements with multiple classes', () => {
      document.body.innerHTML = '<div class="regular ct-inline-translation another"><span>Test</span></div>';
      const span = document.querySelector('span');
      expect(shouldIgnoreTarget(span)).toBe(true);
    });
  });

  describe('isWordWrapper', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should return false for null target', () => {
      expect(isWordWrapper(null)).toBe(false);
    });

    it('should return false for undefined target', () => {
      expect(isWordWrapper(undefined)).toBe(false);
    });

    it('should return true for word wrapper elements', () => {
      document.body.innerHTML = '<span class="ct-word-wrapper">Test</span>';
      const span = document.querySelector('span');
      expect(isWordWrapper(span)).toBe(true);
    });

    it('should return true for elements inside word wrapper', () => {
      document.body.innerHTML = '<span class="ct-word-wrapper"><b>Test</b></span>';
      const b = document.querySelector('b');
      expect(isWordWrapper(b)).toBe(true);
    });

    it('should return false for regular elements', () => {
      document.body.innerHTML = '<div><span>Test</span></div>';
      const span = document.querySelector('span');
      expect(isWordWrapper(span)).toBe(false);
    });

    it('should return false for toolbar elements', () => {
      document.body.innerHTML = '<div id="ct-toolbar"><span>Test</span></div>';
      const span = document.querySelector('span');
      expect(isWordWrapper(span)).toBe(false);
    });

    it('should handle elements with multiple classes', () => {
      document.body.innerHTML = '<span class="regular ct-word-wrapper another">Test</span>';
      const span = document.querySelector('span');
      expect(isWordWrapper(span)).toBe(true);
    });
  });

  describe('getSelectedText', () => {
    it('should return null for null selection', () => {
      expect(getSelectedText(null)).toBe(null);
    });

    it('should return null for undefined selection', () => {
      expect(getSelectedText(undefined)).toBe(null);
    });

    it('should return null for empty selection', () => {
      const mockSelection = {
        toString: () => ''
      };
      expect(getSelectedText(mockSelection)).toBe(null);
    });

    it('should return null for whitespace-only selection', () => {
      const mockSelection = {
        toString: () => '   '
      };
      expect(getSelectedText(mockSelection)).toBe(null);
    });

    it('should return trimmed text for valid selection', () => {
      const mockSelection = {
        toString: () => '  hello  '
      };
      expect(getSelectedText(mockSelection)).toBe('hello');
    });

    it('should return text with internal spaces preserved', () => {
      const mockSelection = {
        toString: () => '  hello world  '
      };
      expect(getSelectedText(mockSelection)).toBe('hello world');
    });

    it('should handle selection with newlines', () => {
      const mockSelection = {
        toString: () => '  hello\nworld  '
      };
      expect(getSelectedText(mockSelection)).toBe('hello\nworld');
    });

    it('should handle selection with tabs', () => {
      const mockSelection = {
        toString: () => '\thello\t'
      };
      expect(getSelectedText(mockSelection)).toBe('hello');
    });

    it('should handle unicode text', () => {
      const mockSelection = {
        toString: () => '  你好世界  '
      };
      expect(getSelectedText(mockSelection)).toBe('你好世界');
    });

    it('should handle emojis', () => {
      const mockSelection = {
        toString: () => '  hello 👋  '
      };
      expect(getSelectedText(mockSelection)).toBe('hello 👋');
    });
  });

  describe('extractSelectionData', () => {
    it('should return null for null selection', () => {
      const mockExtractContext = jest.fn();
      expect(extractSelectionData(null, mockExtractContext, 200)).toBe(null);
      expect(mockExtractContext).not.toHaveBeenCalled();
    });

    it('should return null for undefined selection', () => {
      const mockExtractContext = jest.fn();
      expect(extractSelectionData(undefined, mockExtractContext, 200)).toBe(null);
      expect(mockExtractContext).not.toHaveBeenCalled();
    });

    it('should return null for selection with zero ranges', () => {
      const mockSelection = {
        toString: () => 'hello',
        rangeCount: 0
      };
      const mockExtractContext = jest.fn();
      expect(extractSelectionData(mockSelection, mockExtractContext, 200)).toBe(null);
      expect(mockExtractContext).not.toHaveBeenCalled();
    });

    it('should return null for empty selection text', () => {
      const mockSelection = {
        toString: () => '',
        rangeCount: 1,
        getRangeAt: () => ({})
      };
      const mockExtractContext = jest.fn();
      expect(extractSelectionData(mockSelection, mockExtractContext, 200)).toBe(null);
      expect(mockExtractContext).not.toHaveBeenCalled();
    });

    it('should extract data for valid selection', () => {
      const mockRange = { start: 0, end: 5 };
      const mockSelection = {
        toString: () => 'hello',
        rangeCount: 1,
        getRangeAt: (_index) => mockRange
      };
      const mockExtractContext = jest.fn().mockReturnValue('context text');

      const result = extractSelectionData(mockSelection, mockExtractContext, 200);

      expect(result).toEqual({
        text: 'hello',
        context: 'context text',
        range: mockRange
      });
      expect(mockExtractContext).toHaveBeenCalledWith(mockRange, 200);
    });

    it('should trim whitespace from selected text', () => {
      const mockRange = { start: 0, end: 5 };
      const mockSelection = {
        toString: () => '  hello  ',
        rangeCount: 1,
        getRangeAt: () => mockRange
      };
      const mockExtractContext = jest.fn().mockReturnValue('context');

      const result = extractSelectionData(mockSelection, mockExtractContext, 200);

      expect(result.text).toBe('hello');
    });

    it('should use provided context window size', () => {
      const mockRange = { start: 0, end: 5 };
      const mockSelection = {
        toString: () => 'hello',
        rangeCount: 1,
        getRangeAt: () => mockRange
      };
      const mockExtractContext = jest.fn().mockReturnValue('context');

      extractSelectionData(mockSelection, mockExtractContext, 500);

      expect(mockExtractContext).toHaveBeenCalledWith(mockRange, 500);
    });

    it('should handle extractContextFromRange returning null', () => {
      const mockRange = { start: 0, end: 5 };
      const mockSelection = {
        toString: () => 'hello',
        rangeCount: 1,
        getRangeAt: () => mockRange
      };
      const mockExtractContext = jest.fn().mockReturnValue(null);

      const result = extractSelectionData(mockSelection, mockExtractContext, 200);

      expect(result).toEqual({
        text: 'hello',
        context: null,
        range: mockRange
      });
    });

    it('should handle multi-word selection', () => {
      const mockRange = { start: 0, end: 11 };
      const mockSelection = {
        toString: () => 'hello world',
        rangeCount: 1,
        getRangeAt: () => mockRange
      };
      const mockExtractContext = jest.fn().mockReturnValue('surrounding context');

      const result = extractSelectionData(mockSelection, mockExtractContext, 200);

      expect(result.text).toBe('hello world');
      expect(result.context).toBe('surrounding context');
    });
  });

  describe('extractPointData', () => {
    it('should return null when extractWordAtPoint returns null', () => {
      const mockExtractWord = jest.fn().mockReturnValue(null);
      const mockExtractContext = jest.fn();

      const result = extractPointData(100, 200, mockExtractWord, mockExtractContext, 200);

      expect(result).toBe(null);
      expect(mockExtractWord).toHaveBeenCalledWith(100, 200);
      expect(mockExtractContext).not.toHaveBeenCalled();
    });

    it('should return null when extractWordAtPoint returns undefined', () => {
      const mockExtractWord = jest.fn().mockReturnValue(undefined);
      const mockExtractContext = jest.fn();

      const result = extractPointData(100, 200, mockExtractWord, mockExtractContext, 200);

      expect(result).toBe(null);
      expect(mockExtractContext).not.toHaveBeenCalled();
    });

    it('should return null when result has no text', () => {
      const mockExtractWord = jest.fn().mockReturnValue({ text: '', node: {} });
      const mockExtractContext = jest.fn();

      const result = extractPointData(100, 200, mockExtractWord, mockExtractContext, 200);

      expect(result).toBe(null);
      expect(mockExtractContext).not.toHaveBeenCalled();
    });

    it('should return null when result text is null', () => {
      const mockExtractWord = jest.fn().mockReturnValue({ text: null, node: {} });
      const mockExtractContext = jest.fn();

      const result = extractPointData(100, 200, mockExtractWord, mockExtractContext, 200);

      expect(result).toBe(null);
      expect(mockExtractContext).not.toHaveBeenCalled();
    });

    it('should extract data for valid word at point', () => {
      const mockNode = { nodeType: 3, textContent: 'hello' };
      const mockRange = { start: 0, end: 5 };
      const mockExtractWord = jest.fn().mockReturnValue({
        text: 'hello',
        node: mockNode,
        range: mockRange
      });
      const mockExtractContext = jest.fn().mockReturnValue('context text');

      const result = extractPointData(100, 200, mockExtractWord, mockExtractContext, 200);

      expect(result).toEqual({
        text: 'hello',
        context: 'context text',
        range: mockRange
      });
      expect(mockExtractWord).toHaveBeenCalledWith(100, 200);
      expect(mockExtractContext).toHaveBeenCalledWith(mockNode, 200);
    });

    it('should use provided context window size', () => {
      const mockNode = { nodeType: 3 };
      const mockRange = { start: 0, end: 5 };
      const mockExtractWord = jest.fn().mockReturnValue({
        text: 'hello',
        node: mockNode,
        range: mockRange
      });
      const mockExtractContext = jest.fn().mockReturnValue('context');

      extractPointData(100, 200, mockExtractWord, mockExtractContext, 500);

      expect(mockExtractContext).toHaveBeenCalledWith(mockNode, 500);
    });

    it('should handle different coordinate values', () => {
      const mockNode = { nodeType: 3 };
      const mockRange = { start: 0, end: 5 };
      const mockExtractWord = jest.fn().mockReturnValue({
        text: 'hello',
        node: mockNode,
        range: mockRange
      });
      const mockExtractContext = jest.fn().mockReturnValue('context');

      extractPointData(0, 0, mockExtractWord, mockExtractContext, 200);
      expect(mockExtractWord).toHaveBeenCalledWith(0, 0);

      extractPointData(999, 999, mockExtractWord, mockExtractContext, 200);
      expect(mockExtractWord).toHaveBeenCalledWith(999, 999);

      extractPointData(-10, -10, mockExtractWord, mockExtractContext, 200);
      expect(mockExtractWord).toHaveBeenCalledWith(-10, -10);
    });

    it('should handle extractContext returning null', () => {
      const mockNode = { nodeType: 3 };
      const mockRange = { start: 0, end: 5 };
      const mockExtractWord = jest.fn().mockReturnValue({
        text: 'hello',
        node: mockNode,
        range: mockRange
      });
      const mockExtractContext = jest.fn().mockReturnValue(null);

      const result = extractPointData(100, 200, mockExtractWord, mockExtractContext, 200);

      expect(result).toEqual({
        text: 'hello',
        context: null,
        range: mockRange
      });
    });

    it('should handle extractContext returning empty string', () => {
      const mockNode = { nodeType: 3 };
      const mockRange = { start: 0, end: 5 };
      const mockExtractWord = jest.fn().mockReturnValue({
        text: 'hello',
        node: mockNode,
        range: mockRange
      });
      const mockExtractContext = jest.fn().mockReturnValue('');

      const result = extractPointData(100, 200, mockExtractWord, mockExtractContext, 200);

      expect(result.context).toBe('');
    });
  });
});
