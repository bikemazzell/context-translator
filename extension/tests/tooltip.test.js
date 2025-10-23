/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { showTooltip, removeTooltip } from '../content/ui/tooltip.js';
import * as utils from '../shared/utils.js';

jest.mock('../shared/utils.js', () => ({
  isDarkMode: jest.fn()
}));

describe('Tooltip Translation Display', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllTimers();
    jest.useFakeTimers();
    utils.isDarkMode.mockClear();
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

    it('should remove existing tooltip before showing new one', () => {
      showTooltip('First translation', 100, 200);
      const firstTooltip = document.getElementById('ct-translation-popup');
      expect(firstTooltip).toBeTruthy();

      showTooltip('Second translation', 150, 250);
      const tooltips = document.querySelectorAll('#ct-translation-popup');
      expect(tooltips.length).toBe(1);
      expect(tooltips[0].textContent).toBe('Second translation');
    });

    it('should apply dark mode class when isDarkMode returns true', () => {
      utils.isDarkMode.mockReturnValue(true);

      showTooltip('Dark mode translation', 100, 200, 'dark');

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.classList.contains('ct-dark-mode')).toBe(true);
      expect(utils.isDarkMode).toHaveBeenCalledWith('dark');
    });

    it('should not apply dark mode class when isDarkMode returns false', () => {
      utils.isDarkMode.mockReturnValue(false);

      showTooltip('Light mode translation', 100, 200, 'light');

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.classList.contains('ct-dark-mode')).toBe(false);
      expect(utils.isDarkMode).toHaveBeenCalledWith('light');
    });

    it('should use auto dark mode by default', () => {
      utils.isDarkMode.mockReturnValue(false);

      showTooltip('Auto mode translation', 100, 200);

      expect(utils.isDarkMode).toHaveBeenCalledWith('auto');
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
      expect(tooltip.style.color).toBe('#ffffff');
      expect(tooltip.style.border).toBe('none');
    });

    it('should use default opacity when not specified in custom styling', () => {
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
      expect(tooltip.style.color).toBe('#ffffff');
      expect(tooltip.style.border).toBe('none');
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

    it('should fallback to default color for invalid hex', () => {
      const styleSettings = {
        translationBgColor: 'invalid',
        translationBgOpacity: 0.7
      };

      showTooltip('Invalid hex', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.background).toContain('rgba(51, 51, 51, 0.7)');
    });

    it('should handle short hex colors', () => {
      const styleSettings = {
        translationBgColor: '#abc'
      };

      showTooltip('Short hex', 100, 200, 'auto', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.style.background).toContain('rgba(51, 51, 51, 0.9)');
    });

    it('should prioritize custom styling over dark mode', () => {
      utils.isDarkMode.mockReturnValue(true);

      const styleSettings = {
        translationBgColor: '#ff5733',
        translationTextColor: '#ffffff'
      };

      showTooltip('Custom over dark mode', 100, 200, 'dark', styleSettings);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.classList.contains('ct-dark-mode')).toBe(false);
      expect(tooltip.style.background).toContain('rgba(255, 87, 51, 0.9)');
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
      expect(tooltip.style.background).toContain('rgba(255, 87, 51, 1)');
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

    it('should not trigger event listeners before timeout', () => {
      showTooltip('Early event test', 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip).toBeTruthy();

      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);
      outsideElement.click();

      expect(document.getElementById('ct-translation-popup')).toBeTruthy();
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
  });

  describe('Edge cases', () => {
    it('should handle empty translation text', () => {
      showTooltip('', 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip).toBeTruthy();
      expect(tooltip.textContent).toBe('');
    });

    it('should handle very long translation text', () => {
      const longText = 'A'.repeat(10000);
      showTooltip(longText, 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.textContent).toBe(longText);
    });

    it('should handle special characters in translation', () => {
      const specialText = '<script>alert("xss")</script> & "quotes" \' apostrophes';
      showTooltip(specialText, 100, 200);

      const tooltip = document.getElementById('ct-translation-popup');
      expect(tooltip.textContent).toBe(specialText);
      expect(tooltip.innerHTML).not.toContain('<script>');
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
  });
});
