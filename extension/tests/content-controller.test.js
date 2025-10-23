/**
 * Tests for ContentController
 */

import { jest } from '@jest/globals';
import { ContentController } from '../controllers/content-controller.js';

describe('ContentController', () => {
  let controller;
  let mockTranslationService;
  let mockSettingsManager;
  let mockLogger;
  let mockUI;
  let mockClickHandler;
  let mockBrowser;

  beforeEach(() => {
    mockTranslationService = {
      translate: jest.fn(),
      extractTranslation: jest.fn(),
      logResponseDebugInfo: jest.fn(),
      getErrorMessage: jest.fn()
    };

    mockSettingsManager = {
      load: jest.fn().mockResolvedValue(undefined),
      getAll: jest.fn().mockReturnValue({}),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined)
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn()
    };

    mockUI = {
      showToast: jest.fn(),
      showTooltip: jest.fn(),
      showInlineTranslation: jest.fn(),
      clearAllInlineTranslations: jest.fn()
    };

    mockClickHandler = {
      attach: jest.fn(),
      detach: jest.fn()
    };

    mockBrowser = {
      runtime: {
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      }
    };

    controller = new ContentController({
      translationService: mockTranslationService,
      settingsManager: mockSettingsManager,
      logger: mockLogger,
      ui: mockUI,
      clickHandler: mockClickHandler,
      browser: mockBrowser
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with dependencies', () => {
      expect(controller).toBeInstanceOf(ContentController);
    });

    it('should throw if translationService is missing', () => {
      expect(() => new ContentController({
        settingsManager: mockSettingsManager,
        logger: mockLogger,
        ui: mockUI,
        clickHandler: mockClickHandler,
        browser: mockBrowser
      })).toThrow('TranslationService is required');
    });

    it('should throw if settingsManager is missing', () => {
      expect(() => new ContentController({
        translationService: mockTranslationService,
        logger: mockLogger,
        ui: mockUI,
        clickHandler: mockClickHandler,
        browser: mockBrowser
      })).toThrow('SettingsManager is required');
    });

    it('should throw if logger is missing', () => {
      expect(() => new ContentController({
        translationService: mockTranslationService,
        settingsManager: mockSettingsManager,
        ui: mockUI,
        clickHandler: mockClickHandler,
        browser: mockBrowser
      })).toThrow('Logger is required');
    });

    it('should throw if ui is missing', () => {
      expect(() => new ContentController({
        translationService: mockTranslationService,
        settingsManager: mockSettingsManager,
        logger: mockLogger,
        clickHandler: mockClickHandler,
        browser: mockBrowser
      })).toThrow('UI is required');
    });

    it('should throw if clickHandler is missing', () => {
      expect(() => new ContentController({
        translationService: mockTranslationService,
        settingsManager: mockSettingsManager,
        logger: mockLogger,
        ui: mockUI,
        browser: mockBrowser
      })).toThrow('ClickHandler is required');
    });

    it('should throw if browser is missing', () => {
      expect(() => new ContentController({
        translationService: mockTranslationService,
        settingsManager: mockSettingsManager,
        logger: mockLogger,
        ui: mockUI,
        clickHandler: mockClickHandler
      })).toThrow('Browser is required');
    });

    it('should initialize with inactive state', () => {
      expect(controller.isActive()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should load settings', async () => {
      await controller.initialize();

      expect(mockSettingsManager.load).toHaveBeenCalled();
    });

    it('should add message listener', async () => {
      await controller.initialize();

      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should log debug info on success', async () => {
      mockSettingsManager.getAll.mockReturnValue({ darkMode: true });

      await controller.initialize();

      expect(mockLogger.debug).toHaveBeenCalledWith('Settings loaded:', { darkMode: true });
      expect(mockLogger.debug).toHaveBeenCalledWith('Content script initialized');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Load failed');
      mockSettingsManager.load.mockRejectedValue(error);

      await controller.initialize();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize:', error);
    });

    it('should not throw on initialization error', async () => {
      mockSettingsManager.load.mockRejectedValue(new Error('Test error'));

      await expect(controller.initialize()).resolves.toBeUndefined();
    });
  });

  describe('activate', () => {
    it('should activate when inactive', async () => {
      await controller.activate();

      expect(controller.isActive()).toBe(true);
      expect(mockClickHandler.attach).toHaveBeenCalledWith(expect.any(Function));
      expect(mockUI.showToast).toHaveBeenCalledWith('Translator activated', 'success');
      expect(mockLogger.debug).toHaveBeenCalledWith('Activating translator');
    });

    it('should not activate twice', async () => {
      await controller.activate();
      mockClickHandler.attach.mockClear();
      mockUI.showToast.mockClear();

      await controller.activate();

      expect(mockClickHandler.attach).not.toHaveBeenCalled();
      expect(mockUI.showToast).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should deactivate when active', async () => {
      await controller.activate();
      await controller.deactivate();

      expect(controller.isActive()).toBe(false);
      expect(mockClickHandler.detach).toHaveBeenCalled();
      expect(mockUI.clearAllInlineTranslations).toHaveBeenCalled();
      expect(mockUI.showToast).toHaveBeenCalledWith('Translator deactivated', 'info');
      expect(mockLogger.debug).toHaveBeenCalledWith('Deactivating translator');
    });

    it('should not deactivate twice', async () => {
      await controller.deactivate();

      expect(mockClickHandler.detach).not.toHaveBeenCalled();
      expect(mockUI.clearAllInlineTranslations).not.toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    beforeEach(async () => {
      await controller.initialize();
    });

    it('should handle toggle message when inactive', async () => {
      const response = await controller.handleMessage({ action: 'toggle' });

      expect(response).toEqual({ success: true });
      expect(controller.isActive()).toBe(true);
    });

    it('should handle toggle message when active', async () => {
      await controller.activate();

      const response = await controller.handleMessage({ action: 'toggle' });

      expect(response).toEqual({ success: true });
      expect(controller.isActive()).toBe(false);
    });

    it('should handle activate message', async () => {
      const response = await controller.handleMessage({ action: 'activate' });

      expect(response).toEqual({ success: true });
      expect(controller.isActive()).toBe(true);
    });

    it('should handle deactivate message', async () => {
      await controller.activate();

      const response = await controller.handleMessage({ action: 'deactivate' });

      expect(response).toEqual({ success: true });
      expect(controller.isActive()).toBe(false);
    });

    it('should handle getStatus message', async () => {
      const response = await controller.handleMessage({ action: 'getStatus' });

      expect(response).toEqual({ isActive: false });
    });

    it('should handle settingChanged message', async () => {
      const response = await controller.handleMessage({
        action: 'settingChanged',
        key: 'targetLang',
        value: 'fr'
      });

      expect(response).toEqual({ success: true });
      expect(mockSettingsManager.set).toHaveBeenCalledWith('targetLang', 'fr');
    });

    it('should clear translations when displayMode changes while active', async () => {
      await controller.activate();
      mockUI.clearAllInlineTranslations.mockClear();

      await controller.handleMessage({
        action: 'settingChanged',
        key: 'displayMode',
        value: 'inline'
      });

      expect(mockUI.clearAllInlineTranslations).toHaveBeenCalled();
    });

    it('should not clear translations when displayMode changes while inactive', async () => {
      await controller.handleMessage({
        action: 'settingChanged',
        key: 'displayMode',
        value: 'inline'
      });

      expect(mockUI.clearAllInlineTranslations).not.toHaveBeenCalled();
    });

    it('should handle clearTranslations message', async () => {
      const response = await controller.handleMessage({ action: 'clearTranslations' });

      expect(response).toEqual({ success: true });
      expect(mockUI.clearAllInlineTranslations).toHaveBeenCalled();
    });

    it('should return false for unknown messages', () => {
      const response = controller.handleMessage({ action: 'unknown' });

      expect(response).toBe(false);
    });
  });

  describe('handleTranslationRequest', () => {
    beforeEach(async () => {
      await controller.initialize();
      await controller.activate();

      mockSettingsManager.get.mockImplementation((key) => ({
        displayMode: 'tooltip',
        darkMode: false,
        translationBgColor: '#000000',
        translationTextColor: '#ffffff',
        translationBgOpacity: 0.9
      }[key]));

      mockTranslationService.translate.mockResolvedValue({
        success: true,
        data: { translation: 'hola' }
      });
      mockTranslationService.extractTranslation.mockReturnValue('hola');
    });

    it('should handle successful translation with tooltip display', async () => {
      const callback = mockClickHandler.attach.mock.calls[0][0];

      await callback('hello', 'context', {}, 100, 200);

      expect(mockTranslationService.translate).toHaveBeenCalledWith('hello', 'context');
      expect(mockUI.showTooltip).toHaveBeenCalledWith(
        'hola',
        100,
        200,
        false,
        {
          translationBgColor: '#000000',
          translationTextColor: '#ffffff',
          translationBgOpacity: 0.9
        }
      );
    });

    it('should handle successful translation with inline display', async () => {
      mockSettingsManager.get.mockImplementation((key) => ({
        displayMode: 'inline',
        darkMode: true,
        translationBgColor: '#ffffff',
        translationTextColor: '#000000',
        translationBgOpacity: 0.8
      }[key]));

      const callback = mockClickHandler.attach.mock.calls[0][0];
      const mockRange = {};

      await callback('hello', 'context', mockRange, 100, 200);

      expect(mockUI.showInlineTranslation).toHaveBeenCalledWith(
        'hola',
        mockRange,
        'hello',
        true,
        {
          translationBgColor: '#ffffff',
          translationTextColor: '#000000',
          translationBgOpacity: 0.8
        }
      );
    });

    it('should log debug info for responses', async () => {
      const response = {
        success: true,
        data: {
          translation: 'hola',
          debugInfo: { rawContent: 'hola' }
        }
      };
      mockTranslationService.translate.mockResolvedValue(response);

      const callback = mockClickHandler.attach.mock.calls[0][0];

      await callback('hello', 'context', {}, 100, 200);

      expect(mockTranslationService.logResponseDebugInfo).toHaveBeenCalledWith(response);
    });

    it('should log when translation is from cache', async () => {
      const response = {
        success: true,
        data: {
          translation: 'hola',
          cached: true
        }
      };
      mockTranslationService.translate.mockResolvedValue(response);
      mockTranslationService.extractTranslation.mockReturnValue('hola');

      const callback = mockClickHandler.attach.mock.calls[0][0];

      await callback('hello', 'context', {}, 100, 200);

      expect(mockLogger.debug).toHaveBeenCalledWith('Translation from cache');
    });

    it('should handle translation failure', async () => {
      const response = {
        success: false,
        error: 'API error'
      };
      mockTranslationService.translate.mockResolvedValue(response);
      mockTranslationService.getErrorMessage.mockReturnValue('API error');

      const callback = mockClickHandler.attach.mock.calls[0][0];

      await callback('hello', 'context', {}, 100, 200);

      expect(mockUI.showToast).toHaveBeenCalledWith('Translation failed: API error', 'error');
      expect(mockLogger.error).toHaveBeenCalledWith('Translation failed:', 'API error');
    });

    it('should handle translation errors', async () => {
      const error = new Error('Network error');
      mockTranslationService.translate.mockRejectedValue(error);

      const callback = mockClickHandler.attach.mock.calls[0][0];

      await callback('hello', 'context', {}, 100, 200);

      expect(mockUI.showToast).toHaveBeenCalledWith('Translation error: Network error', 'error');
      expect(mockLogger.error).toHaveBeenCalledWith('Translation error:', error);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await controller.initialize();
      await controller.activate();
    });

    it('should cleanup resources', () => {
      controller.cleanup();

      expect(mockClickHandler.detach).toHaveBeenCalled();
      expect(mockUI.clearAllInlineTranslations).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Cleaning up content controller');
    });

    it('should remove message listener', () => {
      const messageHandler = mockBrowser.runtime.onMessage.addListener.mock.calls[0][0];

      controller.cleanup();

      expect(mockBrowser.runtime.onMessage.removeListener).toHaveBeenCalledWith(messageHandler);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null translation result', async () => {
      await controller.initialize();
      await controller.activate();

      mockSettingsManager.get.mockImplementation((key) => ({
        displayMode: 'tooltip',
        darkMode: false,
        translationBgColor: '#000000',
        translationTextColor: '#ffffff',
        translationBgOpacity: 0.9
      }[key]));

      mockTranslationService.translate.mockResolvedValue({
        success: true,
        data: {}
      });
      mockTranslationService.extractTranslation.mockReturnValue(null);

      const callback = mockClickHandler.attach.mock.calls[0][0];

      await callback('hello', 'context', {}, 100, 200);

      expect(mockUI.showTooltip).toHaveBeenCalledWith(
        null,
        100,
        200,
        false,
        {
          translationBgColor: '#000000',
          translationTextColor: '#ffffff',
          translationBgOpacity: 0.9
        }
      );
    });

    it('should handle empty context', async () => {
      await controller.initialize();
      await controller.activate();

      const callback = mockClickHandler.attach.mock.calls[0][0];

      await callback('hello', '', {}, 100, 200);

      expect(mockTranslationService.translate).toHaveBeenCalledWith('hello', '');
    });
  });
});
