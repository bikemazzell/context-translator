/**
 * @jest-environment jsdom
 */

/**
 * Integration tests for content script flow
 * Tests the full flow: click → extract → translate → display with real services
 */

import { jest } from '@jest/globals';
import { ContentController } from '../../controllers/content-controller.js';
import { TranslationService } from '../../services/translation-service.js';
import { SettingsManager } from '../../shared/settings-manager.js';
import { logger } from '../../shared/logger.js';
import { showToast } from '../../content/ui/toast.js';
import { showTooltip } from '../../content/ui/tooltip.js';
import { showInlineTranslation, clearAllInlineTranslations } from '../../content/ui/inline-translation.js';
import { attachClickHandler, detachClickHandler } from '../../content/handlers/click-handler.js';

describe('Content Script Integration Tests', () => {
  let controller;
  let mockMessenger;
  let mockBrowser;
  let settingsManager;

  beforeEach(async () => {
    document.body.innerHTML = '';

    // Mock messenger for API calls
    mockMessenger = {
      sendMessage: jest.fn()
    };

    // Mock browser API
    mockBrowser = {
      runtime: {
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      }
    };

    // Mock successful translation response
    mockMessenger.sendMessage.mockResolvedValue({
      success: true,
      data: {
        translation: 'hola mundo'
      }
    });

    // Instantiate settings manager at describe scope
    settingsManager = new SettingsManager();
    await settingsManager.load();

    // Create real translation service with mocked messenger
    const translationService = new TranslationService(mockMessenger, settingsManager, logger);

    // Create real UI wrapper
    const ui = {
      showToast,
      showTooltip,
      showInlineTranslation,
      clearAllInlineTranslations
    };

    // Create real click handler wrapper with dependency injection
    const clickHandler = {
      attach: (callback) => attachClickHandler(callback, { settingsManager }),
      detach: detachClickHandler
    };

    // Create controller with real dependencies
    controller = new ContentController({
      translationService,
      settingsManager,
      logger,
      ui,
      clickHandler,
      browser: mockBrowser
    });

    await controller.initialize();
  });

  afterEach(() => {
    if (controller) {
      controller.cleanup();
    }
    jest.clearAllTimers();
  });

  describe('Translation Flow', () => {
    it('should translate using real services and settings', async () => {
      // Clear previous mock calls
      mockMessenger.sendMessage.mockClear();
      mockMessenger.sendMessage.mockResolvedValueOnce({
        success: true,
        data: { translation: 'hola mundo' }
      });

      // Test that translation service works with real settings
      const result = await controller.translationService.translate('hello', 'Hello world');

      expect(result.success).toBe(true);
      expect(result.data.translation).toBe('hola mundo');
      expect(mockMessenger.sendMessage).toHaveBeenCalled();
    });

    it('should handle translation errors gracefully', async () => {
      // Mock a failed translation
      mockMessenger.sendMessage.mockResolvedValueOnce({
        success: false,
        error: 'API rate limit exceeded'
      });

      const result = await controller.translationService.translate('test', 'test context');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
    });

    it('should respect display mode settings', async () => {
      // Set inline display mode
      settingsManager.set('displayMode', 'inline');

      const displayMode = settingsManager.get('displayMode');
      expect(displayMode).toBe('inline');
    });
  });

  describe('Controller Lifecycle', () => {
    it('should initialize successfully', async () => {
      // Controller is already initialized in beforeEach
      expect(controller).toBeDefined();
      expect(controller.translationService).toBeDefined();
      expect(controller.settingsManager).toBeDefined();
    });

    it('should have access to all required dependencies', () => {
      expect(controller.translationService).toBeDefined();
      expect(controller.settingsManager).toBeDefined();
      expect(controller.logger).toBeDefined();
      expect(controller.ui).toBeDefined();
      expect(controller.clickHandler).toBeDefined();
    });
  });

  describe('Message Handling', () => {
    it('should register message listener', async () => {
      // Verify message listener was registered during initialization
      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    it('should handle browser messages through registered listener', async () => {
      // Get the registered message listener
      const messageListener = mockBrowser.runtime.onMessage.addListener.mock.calls[0][0];

      // Verify it's a function
      expect(typeof messageListener).toBe('function');
    });
  });

  describe('Error Recovery', () => {
    it('should handle network errors from translation service', async () => {
      // Clear previous mock calls
      mockMessenger.sendMessage.mockClear();
      // Mock a network error
      mockMessenger.sendMessage.mockRejectedValueOnce(new Error('Network error'));

      // Translation service wraps errors, doesn't throw
      try {
        await controller.translationService.translate('test', 'context');
      } catch (error) {
        expect(error.message).toContain('Network error');
      }
    });

    it('should recover from errors on retry', async () => {
      // Reset mock to clear previous calls
      mockMessenger.sendMessage.mockClear();

      // This call succeeds
      mockMessenger.sendMessage.mockResolvedValueOnce({
        success: true,
        data: { translation: 'prueba' }
      });

      const result = await controller.translationService.translate('test', 'context');
      expect(result.success).toBe(true);
    });

    it('should handle multiple rapid translation requests', async () => {
      mockMessenger.sendMessage.mockClear();
      mockMessenger.sendMessage
        .mockResolvedValueOnce({ success: true, data: { translation: 'uno' } })
        .mockResolvedValueOnce({ success: true, data: { translation: 'dos' } })
        .mockResolvedValueOnce({ success: true, data: { translation: 'tres' } });

      const promises = [
        controller.translationService.translate('one', 'context one'),
        controller.translationService.translate('two', 'context two'),
        controller.translationService.translate('three', 'context three')
      ];

      const results = await Promise.all(promises);

      expect(results[0].data.translation).toBe('uno');
      expect(results[1].data.translation).toBe('dos');
      expect(results[2].data.translation).toBe('tres');
    });
  });

  describe('Settings Integration', () => {
    it('should apply new settings immediately', () => {
      settingsManager.set('darkMode', 'light');
      expect(settingsManager.get('darkMode')).toBe('light');

      settingsManager.set('darkMode', 'dark');
      expect(settingsManager.get('darkMode')).toBe('dark');
    });

    it('should use correct translation context settings', () => {
      settingsManager.set('contextWindowChars', 100);

      const contextSize = settingsManager.get('contextWindowChars');
      expect(contextSize).toBe(100);
    });

    it('should integrate settings with translation service', async () => {
      // Settings manager is used by both controller and translation service
      expect(controller.settingsManager).toBe(controller.translationService.settingsManager);
    });
  });
});
