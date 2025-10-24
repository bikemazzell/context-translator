/**
 * Tests for PopupController
 */

import { jest } from '@jest/globals';
import { PopupController } from '../controllers/popup-controller.js';

describe('PopupController', () => {
  let controller;
  let mockSettingsService;
  let mockLanguageService;
  let mockUIStateManager;
  let mockStorageService;
  let mockMessenger;

  beforeEach(() => {
    mockSettingsService = {
      loadSettings: jest.fn().mockResolvedValue({
        sourceLang: 'English',
        targetLang: 'German',
        darkMode: 'auto'
      }),
      saveSettings: jest.fn().mockResolvedValue(undefined),
      getSetting: jest.fn(),
      setSetting: jest.fn().mockResolvedValue(undefined),
      notifyContentScript: jest.fn().mockResolvedValue(undefined),
      applyDarkMode: jest.fn().mockReturnValue(false),
      getDefaults: jest.fn().mockReturnValue({})
    };

    mockLanguageService = {
      getLanguages: jest.fn().mockResolvedValue(['English', 'German', 'French']),
      addLanguage: jest.fn(),
      removeLanguage: jest.fn()
    };

    mockUIStateManager = {
      getCurrentScreen: jest.fn().mockReturnValue('main'),
      showMainScreen: jest.fn(),
      showSettingsScreen: jest.fn(),
      isMainScreen: jest.fn().mockReturnValue(true),
      showForm: jest.fn(),
      hideForm: jest.fn(),
      isFormVisible: jest.fn().mockReturnValue(false),
      setPendingDelete: jest.fn(),
      clearPendingDelete: jest.fn(),
      getPendingDelete: jest.fn().mockReturnValue(null),
      isPendingDelete: jest.fn().mockReturnValue(false),
      setButtonDisabled: jest.fn(),
      setButtonText: jest.fn(),
      clearButtonText: jest.fn(),
      reset: jest.fn()
    };

    mockStorageService = {
      getSettings: jest.fn(),
      setSettings: jest.fn()
    };

    mockMessenger = {
      sendMessage: jest.fn(),
      queryTabs: jest.fn().mockResolvedValue([{ id: 1 }]),
      sendTabMessage: jest.fn().mockResolvedValue({ isActive: false })
    };

    controller = new PopupController({
      settingsService: mockSettingsService,
      languageService: mockLanguageService,
      uiStateManager: mockUIStateManager,
      storageService: mockStorageService,
      messenger: mockMessenger
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with dependencies', () => {
      expect(controller).toBeInstanceOf(PopupController);
    });

    it('should throw if settingsService is missing', () => {
      expect(() => new PopupController({
        languageService: mockLanguageService,
        uiStateManager: mockUIStateManager,
        storageService: mockStorageService,
        messenger: mockMessenger
      })).toThrow('SettingsService is required');
    });

    it('should throw if languageService is missing', () => {
      expect(() => new PopupController({
        settingsService: mockSettingsService,
        uiStateManager: mockUIStateManager,
        storageService: mockStorageService,
        messenger: mockMessenger
      })).toThrow('LanguageService is required');
    });

    it('should throw if uiStateManager is missing', () => {
      expect(() => new PopupController({
        settingsService: mockSettingsService,
        languageService: mockLanguageService,
        storageService: mockStorageService,
        messenger: mockMessenger
      })).toThrow('UIStateManager is required');
    });

    it('should throw if storageService is missing', () => {
      expect(() => new PopupController({
        settingsService: mockSettingsService,
        languageService: mockLanguageService,
        uiStateManager: mockUIStateManager,
        messenger: mockMessenger
      })).toThrow('StorageService is required');
    });

    it('should throw if messenger is missing', () => {
      expect(() => new PopupController({
        settingsService: mockSettingsService,
        languageService: mockLanguageService,
        uiStateManager: mockUIStateManager,
        storageService: mockStorageService
      })).toThrow('Messenger is required');
    });
  });

  describe('initialize', () => {
    it('should load settings and languages', async () => {
      await controller.initialize();

      expect(mockSettingsService.loadSettings).toHaveBeenCalled();
      expect(mockLanguageService.getLanguages).toHaveBeenCalled();
    });

    it('should apply dark mode', async () => {
      await controller.initialize();

      expect(mockSettingsService.applyDarkMode).toHaveBeenCalled();
    });

    it('should check translator status', async () => {
      await controller.initialize();

      expect(mockMessenger.queryTabs).toHaveBeenCalled();
      expect(mockMessenger.sendTabMessage).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockSettingsService.loadSettings.mockRejectedValue(new Error('Load failed'));

      await expect(controller.initialize()).resolves.toBeUndefined();
    });
  });

  describe('Screen Navigation', () => {
    it('should navigate to settings screen', () => {
      controller.navigateToSettings();

      expect(mockUIStateManager.showSettingsScreen).toHaveBeenCalled();
    });

    it('should navigate to main screen', () => {
      controller.navigateToMain();

      expect(mockUIStateManager.showMainScreen).toHaveBeenCalled();
    });
  });

  describe('Language Management', () => {
    it('should add language successfully', async () => {
      mockLanguageService.addLanguage.mockResolvedValue({
        success: true,
        languages: ['English', 'German', 'Spanish']
      });

      const result = await controller.addLanguage('Spanish');

      expect(mockLanguageService.addLanguage).toHaveBeenCalledWith('Spanish');
      expect(result.success).toBe(true);
      expect(mockUIStateManager.hideForm).toHaveBeenCalled();
    });

    it('should handle add language failure', async () => {
      mockLanguageService.addLanguage.mockResolvedValue({
        success: false,
        error: 'Already exists'
      });

      const result = await controller.addLanguage('English');

      expect(result.success).toBe(false);
      expect(mockUIStateManager.hideForm).not.toHaveBeenCalled();
    });

    it('should disable button during add operation', async () => {
      mockLanguageService.addLanguage.mockResolvedValue({
        success: true,
        languages: []
      });

      await controller.addLanguage('Spanish');

      expect(mockUIStateManager.setButtonDisabled).toHaveBeenCalledWith('saveLanguage', true);
    });

    it('should re-enable button after add operation', async () => {
      mockLanguageService.addLanguage.mockResolvedValue({
        success: true,
        languages: []
      });

      await controller.addLanguage('Spanish');

      expect(mockUIStateManager.setButtonDisabled).toHaveBeenCalledWith('saveLanguage', false);
    });

    it('should remove language successfully', async () => {
      mockLanguageService.removeLanguage.mockResolvedValue({
        success: true,
        languages: ['English', 'German']
      });
      mockSettingsService.getSetting.mockReturnValue('English');

      const result = await controller.removeLanguage('French');

      expect(mockLanguageService.removeLanguage).toHaveBeenCalledWith('French');
      expect(result.success).toBe(true);
    });

    it('should handle remove language failure', async () => {
      mockLanguageService.removeLanguage.mockResolvedValue({
        success: false,
        error: 'Cannot remove'
      });

      const result = await controller.removeLanguage('English');

      expect(result.success).toBe(false);
    });

    it('should update settings if removed language was selected', async () => {
      mockLanguageService.removeLanguage.mockResolvedValue({
        success: true,
        languages: ['English', 'French']
      });
      mockSettingsService.getSetting.mockImplementation((key) => {
        if (key === 'sourceLang') {return 'German';}
        if (key === 'targetLang') {return 'German';}
      });

      await controller.removeLanguage('German');

      expect(mockSettingsService.setSetting).toHaveBeenCalledWith('sourceLang', 'English');
      expect(mockSettingsService.setSetting).toHaveBeenCalledWith('targetLang', 'French');
    });
  });

  describe('Settings Management', () => {
    it('should save setting', async () => {
      await controller.saveSetting('darkMode', 'dark');

      expect(mockSettingsService.setSetting).toHaveBeenCalledWith('darkMode', 'dark');
    });

    it('should notify content script of setting change', async () => {
      await controller.saveSetting('sourceLang', 'French');

      expect(mockSettingsService.notifyContentScript).toHaveBeenCalledWith('sourceLang', 'French');
    });

    it('should apply dark mode when dark mode setting changes', async () => {
      await controller.saveSetting('darkMode', 'dark');

      expect(mockSettingsService.applyDarkMode).toHaveBeenCalledWith('dark');
    });

    it('should handle save setting errors', async () => {
      mockSettingsService.setSetting.mockRejectedValue(new Error('Save failed'));

      await expect(controller.saveSetting('darkMode', 'dark')).rejects.toThrow('Save failed');
    });

    it('should update currentSettings after saving', async () => {
      controller.currentSettings = { darkMode: 'auto', sourceLang: 'English' };

      await controller.saveSetting('darkMode', 'dark');

      expect(controller.currentSettings.darkMode).toBe('dark');
    });
  });

  describe('Translator Toggle', () => {
    it('should toggle translator', async () => {
      mockMessenger.sendTabMessage.mockResolvedValue({ success: true });

      await controller.toggleTranslator();

      expect(mockMessenger.queryTabs).toHaveBeenCalled();
      expect(mockMessenger.sendTabMessage).toHaveBeenCalledWith(
        expect.any(Number),
        { action: 'toggle' }
      );
    });

    it('should handle toggle errors gracefully', async () => {
      mockMessenger.queryTabs.mockRejectedValue(new Error('No tabs'));

      await expect(controller.toggleTranslator()).resolves.toBeUndefined();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache successfully', async () => {
      mockMessenger.sendMessage.mockResolvedValue({ success: true });

      const result = await controller.clearCache();

      expect(mockMessenger.sendMessage).toHaveBeenCalledWith({ type: 'clearCache' });
      expect(result.success).toBe(true);
    });

    it('should handle clear cache failure', async () => {
      mockMessenger.sendMessage.mockResolvedValue({ success: false, error: 'Failed' });

      const result = await controller.clearCache();

      expect(result.success).toBe(false);
    });

    it('should update button state during cache clear', async () => {
      mockMessenger.sendMessage.mockResolvedValue({ success: true });

      await controller.clearCache();

      expect(mockUIStateManager.setButtonDisabled).toHaveBeenCalledWith('clearCache', true);
      expect(mockUIStateManager.setButtonText).toHaveBeenCalledWith('clearCache', 'Clearing...');
    });

    it('should restore button state after cache clear', async () => {
      jest.useFakeTimers();
      mockMessenger.sendMessage.mockResolvedValue({ success: true });

      await controller.clearCache();

      // Fast-forward time
      jest.advanceTimersByTime(1500);

      // Should have restored
      expect(mockUIStateManager.setButtonDisabled).toHaveBeenCalledWith('clearCache', false);
      expect(mockUIStateManager.clearButtonText).toHaveBeenCalledWith('clearCache');

      jest.useRealTimers();
    });

    it('should handle cache clear failure with button restore', async () => {
      jest.useFakeTimers();
      mockMessenger.sendMessage.mockResolvedValue({ success: false, error: 'Failed' });

      const result = await controller.clearCache();

      expect(result.success).toBe(false);
      expect(mockUIStateManager.setButtonText).toHaveBeenCalledWith('clearCache', 'Failed');

      // Fast-forward time
      jest.advanceTimersByTime(1500);

      expect(mockUIStateManager.clearButtonText).toHaveBeenCalledWith('clearCache');
      expect(mockUIStateManager.setButtonDisabled).toHaveBeenCalledWith('clearCache', false);

      jest.useRealTimers();
    });

    it('should handle cache clear error with button restore', async () => {
      jest.useFakeTimers();
      mockMessenger.sendMessage.mockRejectedValue(new Error('Network error'));

      const result = await controller.clearCache();

      expect(result.success).toBe(false);
      expect(mockUIStateManager.setButtonText).toHaveBeenCalledWith('clearCache', 'Error');

      // Fast-forward time
      jest.advanceTimersByTime(1500);

      expect(mockUIStateManager.clearButtonText).toHaveBeenCalledWith('clearCache');
      expect(mockUIStateManager.setButtonDisabled).toHaveBeenCalledWith('clearCache', false);

      jest.useRealTimers();
    });
  });

  describe('Clear Translations', () => {
    it('should clear translations', async () => {
      mockMessenger.sendTabMessage.mockResolvedValue(undefined);

      await controller.clearTranslations();

      expect(mockMessenger.queryTabs).toHaveBeenCalled();
      expect(mockMessenger.sendTabMessage).toHaveBeenCalledWith(
        expect.any(Number),
        { action: 'clearTranslations' }
      );
    });

    it('should handle clear translations errors gracefully', async () => {
      mockMessenger.queryTabs.mockRejectedValue(new Error('No tabs'));

      await expect(controller.clearTranslations()).resolves.toBeUndefined();
    });
  });

  describe('getLanguages', () => {
    it('should return loaded languages', async () => {
      await controller.initialize();

      const languages = controller.getLanguages();

      expect(languages).toEqual(['English', 'German', 'French']);
    });

    it('should return empty array if not initialized', () => {
      const languages = controller.getLanguages();

      expect(languages).toEqual([]);
    });
  });

  describe('getCurrentSettings', () => {
    it('should return current settings', async () => {
      await controller.initialize();

      const settings = controller.getCurrentSettings();

      expect(settings.sourceLang).toBe('English');
    });

    it('should return null if not initialized', () => {
      const settings = controller.getCurrentSettings();

      expect(settings).toBeNull();
    });
  });
});
