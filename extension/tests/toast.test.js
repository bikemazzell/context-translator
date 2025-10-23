/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { showToast, removeToast } from '../content/ui/toast.js';

describe('Toast Notifications', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('showToast', () => {
    it('should create and append toast element to body', () => {
      showToast('Test message');

      const toast = document.querySelector('.ct-toast');
      expect(toast).toBeTruthy();
      expect(toast.textContent).toBe('Test message');
      expect(document.body.contains(toast)).toBe(true);
    });

    it('should apply info class by default', () => {
      showToast('Info message');

      const toast = document.querySelector('.ct-toast');
      expect(toast.classList.contains('ct-toast')).toBe(true);
      expect(toast.classList.contains('ct-info')).toBe(true);
    });

    it('should apply success class when type is success', () => {
      showToast('Success message', 'success');

      const toast = document.querySelector('.ct-toast');
      expect(toast.classList.contains('ct-success')).toBe(true);
    });

    it('should apply error class when type is error', () => {
      showToast('Error message', 'error');

      const toast = document.querySelector('.ct-toast');
      expect(toast.classList.contains('ct-error')).toBe(true);
    });

    it('should remove toast after default duration', () => {
      showToast('Temporary message');

      const toast = document.querySelector('.ct-toast');
      expect(document.body.contains(toast)).toBe(true);

      jest.advanceTimersByTime(3000);

      expect(document.body.contains(toast)).toBe(false);
    });

    it('should remove toast after custom duration', () => {
      const customDuration = 5000;
      showToast('Custom duration message', 'info', customDuration);

      const toast = document.querySelector('.ct-toast');
      expect(document.body.contains(toast)).toBe(true);

      jest.advanceTimersByTime(4999);
      expect(document.body.contains(toast)).toBe(true);

      jest.advanceTimersByTime(1);
      expect(document.body.contains(toast)).toBe(false);
    });

    it('should handle multiple toasts without interference', () => {
      showToast('First toast', 'info');
      showToast('Second toast', 'success');
      showToast('Third toast', 'error');

      const toasts = document.querySelectorAll('.ct-toast');
      expect(toasts.length).toBe(3);
      expect(toasts[0].textContent).toBe('First toast');
      expect(toasts[1].textContent).toBe('Second toast');
      expect(toasts[2].textContent).toBe('Third toast');
    });

    it('should remove multiple toasts after their respective durations', () => {
      showToast('Short toast', 'info', 1000);
      showToast('Long toast', 'info', 3000);

      expect(document.querySelectorAll('.ct-toast').length).toBe(2);

      jest.advanceTimersByTime(1000);
      expect(document.querySelectorAll('.ct-toast').length).toBe(1);
      expect(document.querySelector('.ct-toast').textContent).toBe('Long toast');

      jest.advanceTimersByTime(2000);
      expect(document.querySelectorAll('.ct-toast').length).toBe(0);
    });

    it('should handle empty message', () => {
      showToast('');

      const toast = document.querySelector('.ct-toast');
      expect(toast).toBeTruthy();
      expect(toast.textContent).toBe('');
    });

    it('should handle message with special characters', () => {
      const specialMessage = 'Test <script>alert("xss")</script> & "quotes"';
      showToast(specialMessage);

      const toast = document.querySelector('.ct-toast');
      expect(toast.textContent).toBe(specialMessage);
      expect(toast.innerHTML).not.toContain('<script>');
    });
  });

  describe('removeToast', () => {
    it('should remove toast element from DOM', () => {
      const toast = document.createElement('div');
      toast.className = 'ct-toast';
      document.body.appendChild(toast);

      expect(document.body.contains(toast)).toBe(true);

      removeToast(toast);

      expect(document.body.contains(toast)).toBe(false);
    });

    it('should handle null toast element gracefully', () => {
      expect(() => removeToast(null)).not.toThrow();
    });

    it('should handle toast without parent element gracefully', () => {
      const toast = document.createElement('div');
      expect(() => removeToast(toast)).not.toThrow();
    });

    it('should handle toast that was already removed', () => {
      const toast = document.createElement('div');
      document.body.appendChild(toast);

      removeToast(toast);
      expect(document.body.contains(toast)).toBe(false);

      expect(() => removeToast(toast)).not.toThrow();
    });

    it('should only remove specified toast when multiple exist', () => {
      const toast1 = document.createElement('div');
      const toast2 = document.createElement('div');
      const toast3 = document.createElement('div');

      toast1.className = 'ct-toast';
      toast2.className = 'ct-toast';
      toast3.className = 'ct-toast';

      document.body.appendChild(toast1);
      document.body.appendChild(toast2);
      document.body.appendChild(toast3);

      expect(document.querySelectorAll('.ct-toast').length).toBe(3);

      removeToast(toast2);

      expect(document.querySelectorAll('.ct-toast').length).toBe(2);
      expect(document.body.contains(toast1)).toBe(true);
      expect(document.body.contains(toast2)).toBe(false);
      expect(document.body.contains(toast3)).toBe(true);
    });

    it('should handle toast attached to different parent', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const toast = document.createElement('div');
      container.appendChild(toast);

      expect(container.contains(toast)).toBe(true);

      removeToast(toast);

      expect(container.contains(toast)).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle rapid toast creation and removal', () => {
      for (let i = 0; i < 10; i++) {
        showToast(`Toast ${i}`, 'info', 100);
      }

      expect(document.querySelectorAll('.ct-toast').length).toBe(10);

      jest.advanceTimersByTime(100);

      expect(document.querySelectorAll('.ct-toast').length).toBe(0);
    });

    it('should maintain correct state after partial timer advancement', () => {
      showToast('Toast 1', 'info', 1000);
      jest.advanceTimersByTime(500);

      showToast('Toast 2', 'info', 1000);
      expect(document.querySelectorAll('.ct-toast').length).toBe(2);

      jest.advanceTimersByTime(500);
      expect(document.querySelectorAll('.ct-toast').length).toBe(1);

      jest.advanceTimersByTime(500);
      expect(document.querySelectorAll('.ct-toast').length).toBe(0);
    });
  });
});
