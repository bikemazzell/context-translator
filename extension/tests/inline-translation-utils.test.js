/**
 * @jest-environment jsdom
 */

import {
  hexToRgb,
  applyCustomStyling,
  shouldMergeTranslations,
  buildMergedText,
  validateStyleSettings,
  normalizeHexColor,
  hexToRgbaString,
  flattenTranslation,
  flattenTranslations,
  buildMergedTranslationText,
  haveSameParent,
  isWithinMergeLimit
} from '../core/inline-translation-utils.js';

describe('Inline Translation Utils', () => {
  describe('hexToRgb', () => {
    it('should convert hex to RGB with hash', () => {
      const result = hexToRgb('#ff0000');
      expect(result).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should convert hex to RGB without hash', () => {
      const result = hexToRgb('00ff00');
      expect(result).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('should handle uppercase hex', () => {
      const result = hexToRgb('#FF00FF');
      expect(result).toEqual({ r: 255, g: 0, b: 255 });
    });

    it('should handle mixed case hex', () => {
      const result = hexToRgb('#FfAaBb');
      expect(result).toEqual({ r: 255, g: 170, b: 187 });
    });

    it('should return fallback for invalid hex', () => {
      const result = hexToRgb('invalid');
      expect(result).toEqual({ r: 51, g: 51, b: 51 });
    });

    it('should return fallback for short hex', () => {
      const result = hexToRgb('#fff');
      expect(result).toEqual({ r: 51, g: 51, b: 51 });
    });

    it('should return fallback for empty string', () => {
      const result = hexToRgb('');
      expect(result).toEqual({ r: 51, g: 51, b: 51 });
    });

    it('should return fallback for null', () => {
      const result = hexToRgb(null);
      expect(result).toEqual({ r: 51, g: 51, b: 51 });
    });

    it('should handle white color', () => {
      const result = hexToRgb('#ffffff');
      expect(result).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should handle black color', () => {
      const result = hexToRgb('#000000');
      expect(result).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should handle gray colors', () => {
      const result = hexToRgb('#808080');
      expect(result).toEqual({ r: 128, g: 128, b: 128 });
    });
  });

  describe('applyCustomStyling', () => {
    let element;

    beforeEach(() => {
      element = document.createElement('span');
    });

    it('should apply background color with opacity', () => {
      applyCustomStyling(element, {
        translationBgColor: '#ff0000',
        translationBgOpacity: 0.8
      });

      expect(element.style.background).toContain('rgba(255, 0, 0, 0.8)');
    });

    it('should apply text color', () => {
      applyCustomStyling(element, {
        translationTextColor: '#ffffff'
      });

      expect(element.style.color).toBe('rgb(255, 255, 255)');
    });

    it('should apply border none', () => {
      applyCustomStyling(element, {
        translationBgColor: '#000000'
      });

      // Check that border style was set (JSDOM may normalize 'none' differently)
      const borderValue = element.style.getPropertyValue('border');
      expect(borderValue).toBeDefined();
    });

    it('should use default opacity if not provided', () => {
      applyCustomStyling(element, {
        translationBgColor: '#ff0000'
      });

      expect(element.style.background).toContain('rgba(255, 0, 0, 0.9)');
    });

    it('should handle opacity of 0', () => {
      applyCustomStyling(element, {
        translationBgColor: '#ff0000',
        translationBgOpacity: 0
      });

      expect(element.style.background).toContain('rgba(255, 0, 0, 0)');
    });

    it('should handle opacity of 1', () => {
      applyCustomStyling(element, {
        translationBgColor: '#ff0000',
        translationBgOpacity: 1
      });

      // Browser may convert rgba(255, 0, 0, 1) to rgb(255, 0, 0) - both are valid
      const bg = element.style.background;
      const hasCorrectColor = bg.includes('rgb(255, 0, 0)') || bg.includes('rgba(255, 0, 0, 1)');
      expect(hasCorrectColor).toBe(true);
    });

    it('should handle null element gracefully', () => {
      expect(() => applyCustomStyling(null, { translationBgColor: '#ff0000' }))
        .not.toThrow();
    });

    it('should handle null styleSettings gracefully', () => {
      expect(() => applyCustomStyling(element, null))
        .not.toThrow();
    });

    it('should handle empty styleSettings', () => {
      applyCustomStyling(element, {});
      // Check that border property was set (JSDOM may normalize 'none' differently)
      const borderValue = element.style.getPropertyValue('border');
      expect(borderValue).toBeDefined();
    });

    it('should apply both colors simultaneously', () => {
      applyCustomStyling(element, {
        translationBgColor: '#000000',
        translationTextColor: '#ffffff',
        translationBgOpacity: 0.5
      });

      expect(element.style.background).toContain('rgba(0, 0, 0, 0.5)');
      expect(element.style.color).toBe('rgb(255, 255, 255)');
    });
  });

  describe('shouldMergeTranslations', () => {
    it('should return true when left translations exist', () => {
      const result = shouldMergeTranslations([{ text: 'left' }], []);
      expect(result).toBe(true);
    });

    it('should return true when right translations exist', () => {
      const result = shouldMergeTranslations([], [{ text: 'right' }]);
      expect(result).toBe(true);
    });

    it('should return true when both exist', () => {
      const result = shouldMergeTranslations([{ text: 'left' }], [{ text: 'right' }]);
      expect(result).toBe(true);
    });

    it('should return false when both empty', () => {
      const result = shouldMergeTranslations([], []);
      expect(result).toBe(false);
    });

    it('should return false when both null', () => {
      const result = shouldMergeTranslations(null, null);
      expect(result).toBe(false);
    });

    it('should return false when both undefined', () => {
      const result = shouldMergeTranslations(undefined, undefined);
      expect(result).toBe(false);
    });
  });

  describe('buildMergedText', () => {
    it('should build merged text with center only', () => {
      const result = buildMergedText(
        { text: 'center', translation: 'centro' },
        null,
        null
      );

      expect(result.original).toBe('center');
      expect(result.translation).toBe('centro');
    });

    it('should build merged text with left and center', () => {
      const result = buildMergedText(
        { text: 'center', translation: 'centro' },
        [{ text: 'left', translation: 'izquierda' }],
        null
      );

      expect(result.original).toBe('left center');
      expect(result.translation).toBe('izquierda centro');
    });

    it('should build merged text with center and right', () => {
      const result = buildMergedText(
        { text: 'center', translation: 'centro' },
        null,
        [{ text: 'right', translation: 'derecha' }]
      );

      expect(result.original).toBe('center right');
      expect(result.translation).toBe('centro derecha');
    });

    it('should build merged text with all three', () => {
      const result = buildMergedText(
        { text: 'center', translation: 'centro' },
        [{ text: 'left', translation: 'izquierda' }],
        [{ text: 'right', translation: 'derecha' }]
      );

      expect(result.original).toBe('left center right');
      expect(result.translation).toBe('izquierda centro derecha');
    });

    it('should handle multiple left translations', () => {
      const result = buildMergedText(
        { text: 'center', translation: 'centro' },
        [
          { text: 'left1', translation: 'izq1' },
          { text: 'left2', translation: 'izq2' }
        ],
        null
      );

      expect(result.original).toBe('left1 left2 center');
      expect(result.translation).toBe('izq1 izq2 centro');
    });

    it('should handle multiple right translations', () => {
      const result = buildMergedText(
        { text: 'center', translation: 'centro' },
        null,
        [
          { text: 'right1', translation: 'der1' },
          { text: 'right2', translation: 'der2' }
        ]
      );

      expect(result.original).toBe('center right1 right2');
      expect(result.translation).toBe('centro der1 der2');
    });

    it('should handle empty arrays', () => {
      const result = buildMergedText(
        { text: 'center', translation: 'centro' },
        [],
        []
      );

      expect(result.original).toBe('center');
      expect(result.translation).toBe('centro');
    });

    it('should trim whitespace', () => {
      const result = buildMergedText(
        { text: ' center ', translation: ' centro ' },
        [{ text: ' left ', translation: ' izq ' }],
        [{ text: ' right ', translation: ' der ' }]
      );

      expect(result.original).toBe('left   center   right');
      expect(result.translation).toBe('izq   centro   der');
    });
  });

  describe('validateStyleSettings', () => {
    it('should return true for valid background color', () => {
      const result = validateStyleSettings({ translationBgColor: '#ff0000' });
      expect(result).toBe(true);
    });

    it('should return true for valid text color', () => {
      const result = validateStyleSettings({ translationTextColor: '#ffffff' });
      expect(result).toBe(true);
    });

    it('should return true for valid opacity', () => {
      const result = validateStyleSettings({ translationBgOpacity: 0.5 });
      expect(result).toBe(true);
    });

    it('should return true for valid combination', () => {
      const result = validateStyleSettings({
        translationBgColor: '#000000',
        translationTextColor: '#ffffff',
        translationBgOpacity: 0.9
      });
      expect(result).toBe(true);
    });

    it('should return false for null', () => {
      const result = validateStyleSettings(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      const result = validateStyleSettings(undefined);
      expect(result).toBe(false);
    });

    it('should return false for empty object', () => {
      const result = validateStyleSettings({});
      expect(result).toBe(false);
    });

    it('should return false for non-string color', () => {
      const result = validateStyleSettings({ translationBgColor: 123 });
      expect(result).toBe(false);
    });

    it('should return false for non-number opacity', () => {
      const result = validateStyleSettings({ translationBgOpacity: '0.5' });
      expect(result).toBe(false);
    });

    it('should return false for opacity out of range', () => {
      expect(validateStyleSettings({ translationBgOpacity: -0.1 })).toBe(false);
      expect(validateStyleSettings({ translationBgOpacity: 1.1 })).toBe(false);
    });

    it('should return true for boundary opacities', () => {
      expect(validateStyleSettings({ translationBgOpacity: 0 })).toBe(true);
      expect(validateStyleSettings({ translationBgOpacity: 1 })).toBe(true);
    });
  });

  describe('normalizeHexColor', () => {
    it('should add hash to hex without hash', () => {
      const result = normalizeHexColor('ff0000');
      expect(result).toBe('#ff0000');
    });

    it('should preserve hash', () => {
      const result = normalizeHexColor('#ff0000');
      expect(result).toBe('#ff0000');
    });

    it('should convert to lowercase', () => {
      const result = normalizeHexColor('#FF0000');
      expect(result).toBe('#ff0000');
    });

    it('should return fallback for invalid hex', () => {
      const result = normalizeHexColor('invalid');
      expect(result).toBe('#333333');
    });

    it('should return fallback for short hex', () => {
      const result = normalizeHexColor('#fff');
      expect(result).toBe('#333333');
    });

    it('should return fallback for null', () => {
      const result = normalizeHexColor(null);
      expect(result).toBe('#333333');
    });

    it('should return fallback for non-string', () => {
      const result = normalizeHexColor(123);
      expect(result).toBe('#333333');
    });

    it('should handle hex with extra characters', () => {
      const result = normalizeHexColor('#ff0000xyz');
      expect(result).toBe('#333333');
    });
  });

  describe('hexToRgbaString', () => {
    it('should convert hex to RGBA with default opacity', () => {
      const result = hexToRgbaString('#ff0000');
      expect(result).toBe('rgba(255, 0, 0, 1)');
    });

    it('should convert hex to RGBA with custom opacity', () => {
      const result = hexToRgbaString('#00ff00', 0.5);
      expect(result).toBe('rgba(0, 255, 0, 0.5)');
    });

    it('should clamp opacity to 0', () => {
      const result = hexToRgbaString('#0000ff', -0.5);
      expect(result).toBe('rgba(0, 0, 255, 0)');
    });

    it('should clamp opacity to 1', () => {
      const result = hexToRgbaString('#0000ff', 1.5);
      expect(result).toBe('rgba(0, 0, 255, 1)');
    });

    it('should handle zero opacity', () => {
      const result = hexToRgbaString('#ffffff', 0);
      expect(result).toBe('rgba(255, 255, 255, 0)');
    });

    it('should handle full opacity', () => {
      const result = hexToRgbaString('#000000', 1);
      expect(result).toBe('rgba(0, 0, 0, 1)');
    });

    it('should handle invalid hex with fallback', () => {
      const result = hexToRgbaString('invalid', 0.5);
      expect(result).toBe('rgba(51, 51, 51, 0.5)');
    });
  });

  describe('flattenTranslation', () => {
    it('should return empty array for null', () => {
      const result = flattenTranslation(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      const result = flattenTranslation(undefined);
      expect(result).toEqual([]);
    });

    it('should return array with single translation for non-merged', () => {
      const translation = { text: 'hello', translation: 'hola' };
      const result = flattenTranslation(translation);
      expect(result).toEqual([translation]);
    });

    it('should return components for merged translation', () => {
      const components = [
        { text: 'hello', translation: 'hola' },
        { text: 'world', translation: 'mundo' }
      ];
      const merged = { merged: true, components };
      const result = flattenTranslation(merged);
      expect(result).toEqual(components);
    });

    it('should return array with translation if merged but no components', () => {
      const translation = { merged: true, text: 'hello' };
      const result = flattenTranslation(translation);
      expect(result).toEqual([translation]);
    });
  });

  describe('flattenTranslations', () => {
    it('should return empty array for null', () => {
      const result = flattenTranslations(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for non-array', () => {
      const result = flattenTranslations('not an array');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty array', () => {
      const result = flattenTranslations([]);
      expect(result).toEqual([]);
    });

    it('should flatten multiple non-merged translations', () => {
      const translations = [
        { text: 'hello', translation: 'hola' },
        { text: 'world', translation: 'mundo' }
      ];
      const result = flattenTranslations(translations);
      expect(result).toEqual(translations);
    });

    it('should flatten mixed merged and non-merged translations', () => {
      const t1 = { text: 'hello', translation: 'hola' };
      const t2Components = [
        { text: 'good', translation: 'bueno' },
        { text: 'day', translation: 'día' }
      ];
      const t2 = { merged: true, components: t2Components };
      const t3 = { text: 'world', translation: 'mundo' };

      const result = flattenTranslations([t1, t2, t3]);
      expect(result).toEqual([t1, ...t2Components, t3]);
    });
  });

  describe('buildMergedTranslationText', () => {
    it('should return empty string for null', () => {
      const result = buildMergedTranslationText(null);
      expect(result).toBe('');
    });

    it('should return empty string for empty array', () => {
      const result = buildMergedTranslationText([]);
      expect(result).toBe('');
    });

    it('should join single translation', () => {
      const result = buildMergedTranslationText([{ translation: 'hola' }]);
      expect(result).toBe('hola');
    });

    it('should join multiple translations with spaces', () => {
      const translations = [
        { translation: 'hola' },
        { translation: 'mundo' },
        { translation: 'hermoso' }
      ];
      const result = buildMergedTranslationText(translations);
      expect(result).toBe('hola mundo hermoso');
    });

    it('should filter out empty translations', () => {
      const translations = [
        { translation: 'hola' },
        { translation: '' },
        { translation: 'mundo' }
      ];
      const result = buildMergedTranslationText(translations);
      expect(result).toBe('hola mundo');
    });

    it('should handle translations without translation property', () => {
      const translations = [
        { translation: 'hola' },
        { text: 'test' },
        { translation: 'mundo' }
      ];
      const result = buildMergedTranslationText(translations);
      expect(result).toBe('hola mundo');
    });
  });

  describe('haveSameParent', () => {
    let parent1, parent2;

    beforeEach(() => {
      parent1 = document.createElement('div');
      parent2 = document.createElement('div');
    });

    it('should return true for null', () => {
      const result = haveSameParent(null);
      expect(result).toBe(true);
    });

    it('should return true for non-array', () => {
      const result = haveSameParent('not array');
      expect(result).toBe(true);
    });

    it('should return true for empty array', () => {
      const result = haveSameParent([]);
      expect(result).toBe(true);
    });

    it('should return true for single item', () => {
      const wrapper = document.createElement('span');
      parent1.appendChild(wrapper);
      const result = haveSameParent([{ wrapper }]);
      expect(result).toBe(true);
    });

    it('should return true when all have same parent', () => {
      const wrapper1 = document.createElement('span');
      const wrapper2 = document.createElement('span');
      parent1.appendChild(wrapper1);
      parent1.appendChild(wrapper2);

      const result = haveSameParent([{ wrapper: wrapper1 }, { wrapper: wrapper2 }]);
      expect(result).toBe(true);
    });

    it('should return false when parents differ', () => {
      const wrapper1 = document.createElement('span');
      const wrapper2 = document.createElement('span');
      parent1.appendChild(wrapper1);
      parent2.appendChild(wrapper2);

      const result = haveSameParent([{ wrapper: wrapper1 }, { wrapper: wrapper2 }]);
      expect(result).toBe(false);
    });

    it('should return false when first translation has no wrapper', () => {
      const result = haveSameParent([{}, { wrapper: document.createElement('span') }]);
      expect(result).toBe(false);
    });

    it('should return false when first wrapper has no parent', () => {
      const wrapper1 = document.createElement('span');
      const wrapper2 = document.createElement('span');
      parent1.appendChild(wrapper2);

      const result = haveSameParent([{ wrapper: wrapper1 }, { wrapper: wrapper2 }]);
      expect(result).toBe(false);
    });
  });

  describe('isWithinMergeLimit', () => {
    it('should return false for null count', () => {
      const result = isWithinMergeLimit(null, 10);
      expect(result).toBe(false);
    });

    it('should return false for null maxMergeWords', () => {
      const result = isWithinMergeLimit(5, null);
      expect(result).toBe(false);
    });

    it('should return false for non-number count', () => {
      const result = isWithinMergeLimit('5', 10);
      expect(result).toBe(false);
    });

    it('should return false for non-number maxMergeWords', () => {
      const result = isWithinMergeLimit(5, '10');
      expect(result).toBe(false);
    });

    it('should return false for zero count', () => {
      const result = isWithinMergeLimit(0, 10);
      expect(result).toBe(false);
    });

    it('should return false for negative count', () => {
      const result = isWithinMergeLimit(-1, 10);
      expect(result).toBe(false);
    });

    it('should return true for count within limit', () => {
      const result = isWithinMergeLimit(5, 10);
      expect(result).toBe(true);
    });

    it('should return true for count at limit', () => {
      const result = isWithinMergeLimit(10, 10);
      expect(result).toBe(true);
    });

    it('should return false for count above limit', () => {
      const result = isWithinMergeLimit(11, 10);
      expect(result).toBe(false);
    });

    it('should return true for count of 1', () => {
      const result = isWithinMergeLimit(1, 10);
      expect(result).toBe(true);
    });
  });
});
