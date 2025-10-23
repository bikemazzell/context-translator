/**
 * Tests for UIStateManager
 */

import { jest } from '@jest/globals';
import { UIStateManager } from '../services/ui-state-manager.js';

describe('UIStateManager', () => {
  let manager;

  beforeEach(() => {
    manager = new UIStateManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance', () => {
      expect(manager).toBeInstanceOf(UIStateManager);
    });

    it('should initialize with main screen visible', () => {
      expect(manager.getCurrentScreen()).toBe('main');
    });

    it('should initialize with no pending delete', () => {
      expect(manager.getPendingDelete()).toBeNull();
    });

    it('should initialize with form hidden', () => {
      expect(manager.isFormVisible()).toBe(false);
    });
  });

  describe('Screen Management', () => {
    it('should switch to settings screen', () => {
      manager.showSettingsScreen();
      expect(manager.getCurrentScreen()).toBe('settings');
    });

    it('should switch to main screen', () => {
      manager.showSettingsScreen();
      manager.showMainScreen();
      expect(manager.getCurrentScreen()).toBe('main');
    });

    it('should return true when on main screen', () => {
      expect(manager.isMainScreen()).toBe(true);
    });

    it('should return false when on settings screen', () => {
      manager.showSettingsScreen();
      expect(manager.isMainScreen()).toBe(false);
    });

    it('should return true when on settings screen', () => {
      manager.showSettingsScreen();
      expect(manager.isSettingsScreen()).toBe(true);
    });

    it('should return false when on main screen', () => {
      expect(manager.isSettingsScreen()).toBe(false);
    });
  });

  describe('Form Visibility', () => {
    it('should show form', () => {
      manager.showForm();
      expect(manager.isFormVisible()).toBe(true);
    });

    it('should hide form', () => {
      manager.showForm();
      manager.hideForm();
      expect(manager.isFormVisible()).toBe(false);
    });

    it('should toggle form visibility', () => {
      expect(manager.isFormVisible()).toBe(false);
      manager.toggleForm();
      expect(manager.isFormVisible()).toBe(true);
      manager.toggleForm();
      expect(manager.isFormVisible()).toBe(false);
    });
  });

  describe('Delete Confirmation State', () => {
    it('should set pending delete language', () => {
      manager.setPendingDelete('German');
      expect(manager.getPendingDelete()).toBe('German');
    });

    it('should clear pending delete', () => {
      manager.setPendingDelete('German');
      manager.clearPendingDelete();
      expect(manager.getPendingDelete()).toBeNull();
    });

    it('should return true if language is pending delete', () => {
      manager.setPendingDelete('German');
      expect(manager.isPendingDelete('German')).toBe(true);
    });

    it('should return false if different language is pending', () => {
      manager.setPendingDelete('German');
      expect(manager.isPendingDelete('French')).toBe(false);
    });

    it('should return false if no language is pending', () => {
      expect(manager.isPendingDelete('German')).toBe(false);
    });

    it('should handle null language name', () => {
      expect(manager.isPendingDelete(null)).toBe(false);
    });
  });

  describe('Button State Management', () => {
    it('should track button disabled state', () => {
      manager.setButtonDisabled('save', true);
      expect(manager.isButtonDisabled('save')).toBe(true);
    });

    it('should track button enabled state', () => {
      manager.setButtonDisabled('save', true);
      manager.setButtonDisabled('save', false);
      expect(manager.isButtonDisabled('save')).toBe(false);
    });

    it('should return false for unknown buttons', () => {
      expect(manager.isButtonDisabled('unknown')).toBe(false);
    });

    it('should track multiple buttons independently', () => {
      manager.setButtonDisabled('save', true);
      manager.setButtonDisabled('cancel', false);
      expect(manager.isButtonDisabled('save')).toBe(true);
      expect(manager.isButtonDisabled('cancel')).toBe(false);
    });
  });

  describe('Button Text Management', () => {
    it('should set button text', () => {
      manager.setButtonText('clear', 'Clearing...');
      expect(manager.getButtonText('clear')).toBe('Clearing...');
    });

    it('should return undefined for buttons without custom text', () => {
      expect(manager.getButtonText('save')).toBeUndefined();
    });

    it('should clear button text', () => {
      manager.setButtonText('clear', 'Clearing...');
      manager.clearButtonText('clear');
      expect(manager.getButtonText('clear')).toBeUndefined();
    });

    it('should track multiple button texts independently', () => {
      manager.setButtonText('clear', 'Clearing...');
      manager.setButtonText('save', 'Saving...');
      expect(manager.getButtonText('clear')).toBe('Clearing...');
      expect(manager.getButtonText('save')).toBe('Saving...');
    });
  });

  describe('Complex State Transitions', () => {
    it('should handle screen switch while form is visible', () => {
      manager.showForm();
      manager.showSettingsScreen();
      expect(manager.isSettingsScreen()).toBe(true);
      expect(manager.isFormVisible()).toBe(true);
    });

    it('should maintain pending delete across screen switches', () => {
      manager.setPendingDelete('German');
      manager.showSettingsScreen();
      manager.showMainScreen();
      expect(manager.getPendingDelete()).toBe('German');
    });

    it('should reset all state', () => {
      manager.showSettingsScreen();
      manager.showForm();
      manager.setPendingDelete('German');
      manager.setButtonDisabled('save', true);
      manager.setButtonText('clear', 'Clearing...');

      manager.reset();

      expect(manager.getCurrentScreen()).toBe('main');
      expect(manager.isFormVisible()).toBe(false);
      expect(manager.getPendingDelete()).toBeNull();
      expect(manager.isButtonDisabled('save')).toBe(false);
      expect(manager.getButtonText('clear')).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string for pending delete', () => {
      manager.setPendingDelete('');
      expect(manager.getPendingDelete()).toBe('');
      expect(manager.isPendingDelete('')).toBe(true);
    });

    it('should handle special characters in language names', () => {
      manager.setPendingDelete('Español');
      expect(manager.isPendingDelete('Español')).toBe(true);
    });

    it('should handle unicode in language names', () => {
      manager.setPendingDelete('中文');
      expect(manager.isPendingDelete('中文')).toBe(true);
    });

    it('should handle very long button text', () => {
      const longText = 'A'.repeat(1000);
      manager.setButtonText('button', longText);
      expect(manager.getButtonText('button')).toBe(longText);
    });

    it('should handle clearing non-existent button text', () => {
      expect(() => manager.clearButtonText('nonexistent')).not.toThrow();
    });

    it('should handle multiple resets', () => {
      manager.showSettingsScreen();
      manager.reset();
      manager.reset();
      expect(manager.getCurrentScreen()).toBe('main');
    });
  });
});
