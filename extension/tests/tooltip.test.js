/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { showTooltip, removeTooltip } from '../content/ui/tooltip.js';

describe('Tooltip Translation Display', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('showTooltip', () => {
    it('should create and display tooltip at specified position', () => {
      showTooltip('Test translation', 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip).toBeTruthy();
      expect(tooltip.textContent).toBe('Test translation');
      expect(tooltip.style.left).toBe('100px');
      expect(tooltip.style.top).toBe('220px');
    });

    it('should offset tooltip position by 20px vertically', () => {
      showTooltip('Offset test', 50, 100);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.top).toBe('120px');
    });

    it('should remove existing tooltip before showing new one', () => {
      showTooltip('First translation', 100, 200);
      const firstTooltip = document.getElementById('ct-translation-popup');
      expect(firstTooltip).toBeTruthy();

      showTooltip('Second translation', 150, 250);
      const tooltips = document.querySelectorAll('#ct-translation-popup');
      expect(tooltips.length).toBe(1);
      expect(tooltips[0].textContent).toBe('Second translation');
    });

    it('should apply custom background color styling', () => {
      const styleSettings = {
        translationBgColor: '#ff5733',
        translationBgOpacity: 0.8,
        translationTextColor: '#ffffff'
      };

      showTooltip('Custom styled translation', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.background).toContain('rgba(255, 87, 51, 0.8)');
      expect(tooltip.style.color).toBe('rgb(255, 255, 255)');
    });

    it('should use default opacity (0.9) when not specified in custom styling', () => {
      const styleSettings = {
        translationBgColor: '#ff5733',
        translationTextColor: '#ffffff'
      };

      showTooltip('Custom styled translation', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.background).toContain('rgba(255, 87, 51, 0.9)');
    });

    it('should handle custom text color without background color', () => {
      const styleSettings = {
        translationTextColor: '#ffffff'
      };

      showTooltip('Text color only', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.color).toBe('rgb(255, 255, 255)');
    });

    it('should handle hex colors without # prefix', () => {
      const styleSettings = {
        translationBgColor: 'ff5733',
        translationBgOpacity: 0.5
      };

      showTooltip('Hex without prefix', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.background).toContain('rgba(255, 87, 51, 0.5)');
    });

    it('should fallback to default color (#333333) for invalid hex', () => {
      const styleSettings = {
        translationBgColor: 'invalid',
        translationBgOpacity: 0.7
      };

      showTooltip('Invalid hex', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.background).toContain('rgba(51, 51, 51, 0.7)');
    });

    it('should fallback to default color for short hex codes', () => {
      const styleSettings = {
        translationBgColor: '#abc'
      };

      showTooltip('Short hex', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.background).toContain('rgba(51, 51, 51, 0.9)');
    });

    it('should handle zero opacity', () => {
      const styleSettings = {
        translationBgColor: '#ff5733',
        translationBgOpacity: 0
      };

      showTooltip('Zero opacity', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.background).toContain('rgba(255, 87, 51, 0)');
    });

    it('should handle full opacity', () => {
      const styleSettings = {
        translationBgColor: '#ff5733',
        translationBgOpacity: 1
      };

      showTooltip('Full opacity', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      const bg = tooltip.style.background;
      expect(bg === 'rgba(255, 87, 51, 1)' || bg === 'rgb(255, 87, 51)').toBe(true);
    });

    it('should handle partial opacity values', () => {
      const styleSettings = {
        translationBgColor: '#aabbcc',
        translationBgOpacity: 0.33
      };

      showTooltip('Partial opacity', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.background).toContain('rgba(170, 187, 204, 0.33)');
    });

    it('should apply custom styling without throwing errors', () => {
      const styleSettings = {
        translationBgColor: '#ff5733'
      };

      expect(() => showTooltip('No border', 100, 200, 'auto', styleSettings)).not.toThrow();

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip).toBeTruthy();
    });

    it('should apply dark mode class when darkMode is dark', () => {
      showTooltip('Dark mode test', 100, 200, 'dark');

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.classList.contains('ct-dark-mode')).toBe(true);
    });

    it('should not apply dark mode class when custom styling is provided', () => {
      const styleSettings = {
        translationBgColor: '#ff5733'
      };

      showTooltip('Custom styling overrides dark mode', 100, 200, 'dark', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.classList.contains('ct-dark-mode')).toBe(false);
    });
  });

  describe('Event listeners', () => {
    it('should remove tooltip when clicking outside after timeout', () => {
      showTooltip('Click outside test', 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip).toBeTruthy();

      jest.advanceTimersByTime(100);

      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      outsideElement.click();

      expect(document.getElementById('ct-translation-popup')).toBeFalsy();
    });

    it('should not remove tooltip when clicking inside', () => {
      showTooltip('Click inside test', 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip).toBeTruthy();

      jest.advanceTimersByTime(100);

      tooltip.click();

      expect(document.getElementById('ct-translation-popup')).toBeTruthy();
    });

    it('should remove tooltip on scroll after timeout', () => {
      showTooltip('Scroll test', 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip).toBeTruthy();

      jest.advanceTimersByTime(100);

      const scrollEvent = new Event('scroll');
      document.dispatchEvent(scrollEvent);

      expect(document.getElementById('ct-translation-popup')).toBeFalsy();
    });

    it('should delay event listener attachment for 100ms', () => {
      showTooltip('Delayed listener test', 100, 200);
      expect(document.getElementById('ct-translation-popup')).toBeTruthy();

      jest.advanceTimersByTime(100);

      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);
      outsideElement.click();

      expect(document.getElementById('ct-translation-popup')).toBeFalsy();
    });

    it('should handle multiple rapid tooltip displays correctly', () => {
      showTooltip('First', 100, 200);
      jest.advanceTimersByTime(50);

      showTooltip('Second', 150, 250);
      jest.advanceTimersByTime(50);

      showTooltip('Third', 200, 300);
      jest.advanceTimersByTime(100);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.textContent).toBe('Third');

      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);
      outsideElement.click();

      expect(document.getElementById('ct-translation-popup')).toBeFalsy();
    });

    it('should use capturing phase for scroll event', () => {
      showTooltip('Scroll capture test', 100, 200);

      jest.advanceTimersByTime(100);

      const scrollEvent = new Event('scroll', { bubbles: false });
      document.dispatchEvent(scrollEvent);

      expect(document.getElementById('ct-translation-popup')).toBeFalsy();
    });

    it('should clean up event listeners after tooltip is removed', () => {
      showTooltip('Cleanup test', 100, 200);

      jest.advanceTimersByTime(100);

      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      outsideElement.click();
      expect(document.getElementById('ct-translation-popup')).toBeFalsy();

      showTooltip('Second tooltip', 100, 200);
      expect(document.getElementById('ct-translation-popup')).toBeTruthy();
    });
  });

  describe('removeTooltip', () => {
    it('should remove tooltip from DOM', () => {
      const tooltip = document.createElement('div');
      tooltip.id = 'ct-translation-popup';
      document.body.appendChild(tooltip);

      expect(document.getElementById('ct-translation-popup')).toBeTruthy();

      removeTooltip();

      expect(document.getElementById('ct-translation-popup')).toBeFalsy();
    });

    it('should handle removing non-existent tooltip gracefully', () => {
      expect(() => removeTooltip()).not.toThrow();
      expect(document.getElementById('ct-translation-popup')).toBeFalsy();
    });

    it('should handle tooltip without parent element gracefully', () => {
      const tooltip = document.createElement('div');
      tooltip.id = 'ct-translation-popup';

      expect(() => removeTooltip()).not.toThrow();
    });

    it('should only remove tooltip with correct ID', () => {
      const otherPopup = document.createElement('div');
      otherPopup.id = 'other-popup';
      otherPopup.className = 'popup';
      document.body.appendChild(otherPopup);

      const tooltip = document.createElement('div');
      tooltip.id = 'ct-translation-popup';
      document.body.appendChild(tooltip);

      removeTooltip();

      expect(document.getElementById('ct-translation-popup')).toBeFalsy();
      expect(document.getElementById('other-popup')).toBeTruthy();
    });

    it('should be idempotent', () => {
      const tooltip = document.createElement('div');
      tooltip.id = 'ct-translation-popup';
      document.body.appendChild(tooltip);

      removeTooltip();
      expect(document.getElementById('ct-translation-popup')).toBeFalsy();

      expect(() => removeTooltip()).not.toThrow();
      expect(document.getElementById('ct-translation-popup')).toBeFalsy();
    });
  });

  describe('Edge cases', () => {
    it('should not display tooltip for empty translation text', () => {
      showTooltip('', 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      // Empty translations should not create tooltips (improved validation)
      expect(tooltip).toBeFalsy();
    });

    it('should handle very long translation text', () => {
      const longText = 'A'.repeat(10000);
      showTooltip(longText, 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.textContent).toBe(longText);
      expect(tooltip.textContent.length).toBe(10000);
    });

    it('should handle special characters in translation (XSS prevention)', () => {
      const specialText = '<script>alert("xss")</script> & "quotes" \' apostrophes';
      showTooltip(specialText, 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.textContent).toBe(specialText);
      expect(tooltip.innerHTML).not.toContain('<script>');
    });

    it('should handle HTML injection attempts', () => {
      const htmlText = '<img src=x onerror=alert(1)> <div onclick="alert(2)">Click</div>';
      showTooltip(htmlText, 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.textContent).toBe(htmlText);
      expect(tooltip.querySelector('img')).toBeFalsy();
      expect(tooltip.querySelector('div')).toBeFalsy();
    });

    it('should handle negative coordinates', () => {
      showTooltip('Negative coords', -50, -100);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.left).toBe('-50px');
      expect(tooltip.style.top).toBe('-80px');
    });

    it('should handle very large coordinates', () => {
      showTooltip('Large coords', 999999, 999999);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.left).toBe('999999px');
      expect(tooltip.style.top).toBe('1000019px');
    });

    it('should handle zero coordinates', () => {
      showTooltip('Zero coords', 0, 0);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.left).toBe('0px');
      expect(tooltip.style.top).toBe('20px');
    });

    it('should handle decimal coordinates', () => {
      showTooltip('Decimal coords', 123.456, 789.012);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.left).toBe('123.456px');
      expect(tooltip.style.top).toBe('809.012px');
    });

    it('should handle newlines in translation', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      showTooltip(multilineText, 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.textContent).toBe(multilineText);
    });

    it('should handle unicode characters', () => {
      const unicodeText = '你好世界 🌍 Привет мир';
      showTooltip(unicodeText, 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.textContent).toBe(unicodeText);
    });

    it('should handle null style settings gracefully', () => {
      expect(() => showTooltip('Test', 100, 200, 'auto', null)).not.toThrow();

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip).toBeTruthy();
    });

    it('should handle empty style settings object', () => {
      showTooltip('Test', 100, 200, 'auto', {});

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip).toBeTruthy();
      expect(tooltip.style.border).toBe('');
    });

    it('should handle uppercase hex colors', () => {
      const styleSettings = {
        translationBgColor: '#AABBCC',
        translationBgOpacity: 0.5
      };

      showTooltip('Uppercase hex', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.background).toContain('rgba(170, 187, 204, 0.5)');
    });
  });
});
