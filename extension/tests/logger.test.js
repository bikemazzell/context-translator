/**
 * Tests for Logger utility
 */

import { jest } from '@jest/globals';
import { logger } from '../shared/logger.js';

describe('Logger', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let consoleDebugSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

    logger.setEnabled(true);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('info', () => {
    it('should log info messages when logging is enabled', () => {
      logger.setEnabled(true);
      logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Test message');
    });

    it('should not log info messages when logging is disabled', () => {
      logger.setEnabled(false);
      logger.info('Test message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple arguments', () => {
      logger.setEnabled(true);
      logger.info('Message', 'arg1', 'arg2', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        'Message',
        'arg1',
        'arg2',
        { key: 'value' }
      );
    });

    it('should handle no arguments', () => {
      logger.setEnabled(true);
      logger.info();

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]');
    });

    it('should handle objects and arrays', () => {
      logger.setEnabled(true);
      const obj = { foo: 'bar' };
      const arr = [1, 2, 3];

      logger.info('Data:', obj, arr);

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Data:', obj, arr);
    });
  });

  describe('warn', () => {
    it('should log warn messages when logging is enabled', () => {
      logger.setEnabled(true);
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Warning message');
    });

    it('should not log warn messages when logging is disabled', () => {
      logger.setEnabled(false);
      logger.warn('Warning message');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple arguments', () => {
      logger.setEnabled(true);
      logger.warn('Warning', 'detail1', 'detail2');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        'Warning',
        'detail1',
        'detail2'
      );
    });

    it('should handle errors as arguments', () => {
      logger.setEnabled(true);
      const error = new Error('Test error');

      logger.warn('Warning:', error);

      expect(consoleWarnSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Warning:', error);
    });
  });

  describe('error', () => {
    it('should always log error messages regardless of logging state', () => {
      logger.setEnabled(false);
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Error message');
    });

    it('should log error messages when logging is enabled', () => {
      logger.setEnabled(true);
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Error message');
    });

    it('should handle Error objects', () => {
      logger.setEnabled(true);
      const error = new Error('Test error');

      logger.error('Error occurred:', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        'Error occurred:',
        error
      );
    });

    it('should handle error stack traces', () => {
      logger.setEnabled(true);
      const error = new Error('Test error');

      logger.error('Stack trace:', error.stack);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        'Stack trace:',
        error.stack
      );
    });

    it('should handle multiple arguments', () => {
      logger.setEnabled(true);
      logger.error('Error', 'code:', 500, { detail: 'Internal error' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        'Error',
        'code:',
        500,
        { detail: 'Internal error' }
      );
    });
  });

  describe('debug', () => {
    it('should log debug messages when logging is enabled', () => {
      logger.setEnabled(true);
      logger.debug('Debug message');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Debug message');
    });

    it('should not log debug messages when logging is disabled', () => {
      logger.setEnabled(false);
      logger.debug('Debug message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should handle complex debug data', () => {
      logger.setEnabled(true);
      const debugData = {
        timestamp: Date.now(),
        state: { active: true, count: 5 },
        items: [1, 2, 3]
      };

      logger.debug('Debug data:', debugData);

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        'Debug data:',
        debugData
      );
    });
  });

  describe('setEnabled', () => {
    it('should enable logging', () => {
      logger.setEnabled(false);
      logger.info('Should not log');
      expect(consoleLogSpy).not.toHaveBeenCalled();

      logger.setEnabled(true);
      logger.info('Should log');
      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Should log');
    });

    it('should disable logging', () => {
      logger.setEnabled(true);
      logger.info('Should log');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);

      logger.setEnabled(false);
      logger.info('Should not log');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should affect info, warn, and debug but not error', () => {
      logger.setEnabled(false);

      logger.info('Info');
      logger.warn('Warn');
      logger.debug('Debug');
      logger.error('Error');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Error');
    });

    it('should accept boolean values', () => {
      expect(() => logger.setEnabled(true)).not.toThrow();
      expect(() => logger.setEnabled(false)).not.toThrow();
    });

    it('should handle rapid enable/disable toggling', () => {
      for (let i = 0; i < 10; i++) {
        logger.setEnabled(i % 2 === 0);
        logger.info('Toggle test');
      }

      expect(consoleLogSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle logging from multiple sources concurrently', () => {
      logger.setEnabled(true);

      logger.info('Source 1');
      logger.warn('Source 2');
      logger.debug('Source 3');
      logger.error('Source 4');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should maintain prefix across all log levels', () => {
      logger.setEnabled(true);

      logger.info('Info');
      logger.warn('Warn');
      logger.debug('Debug');
      logger.error('Error');

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Info');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Warn');
      expect(consoleDebugSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Debug');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Error');
    });

    it('should handle empty string messages', () => {
      logger.setEnabled(true);

      logger.info('');
      logger.warn('');
      logger.debug('');
      logger.error('');

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', '');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ContextTranslator]', '');
      expect(consoleDebugSpy).toHaveBeenCalledWith('[ContextTranslator]', '');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ContextTranslator]', '');
    });

    it('should handle null and undefined', () => {
      logger.setEnabled(true);

      logger.info(null);
      logger.warn(undefined);
      logger.debug(null, undefined);
      logger.error(undefined, null);

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', null);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ContextTranslator]', undefined);
      expect(consoleDebugSpy).toHaveBeenCalledWith('[ContextTranslator]', null, undefined);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ContextTranslator]', undefined, null);
    });

    it('should handle special characters and unicode', () => {
      logger.setEnabled(true);

      logger.info('Special: \n\t\r !@#$%^&*()');
      logger.warn('Unicode: 你好 🌍 Привет');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        'Special: \n\t\r !@#$%^&*()'
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        'Unicode: 你好 🌍 Привет'
      );
    });

    it('should handle circular references in objects', () => {
      logger.setEnabled(true);

      const circular = { name: 'test' };
      circular.self = circular;

      expect(() => logger.info('Circular:', circular)).not.toThrow();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle very long messages', () => {
      logger.setEnabled(true);

      const longMessage = 'A'.repeat(10000);
      logger.info(longMessage);

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', longMessage);
    });

    it('should handle repeated logging', () => {
      logger.setEnabled(true);

      for (let i = 0; i < 100; i++) {
        logger.info(`Message ${i}`);
      }

      expect(consoleLogSpy).toHaveBeenCalledTimes(100);
    });
  });

  describe('Edge cases', () => {
    it('should handle functions as arguments', () => {
      logger.setEnabled(true);

      const fn = () => 'test';
      logger.info('Function:', fn);

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Function:', fn);
    });

    it('should handle symbols', () => {
      logger.setEnabled(true);

      const sym = Symbol('test');
      logger.info('Symbol:', sym);

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Symbol:', sym);
    });

    it('should handle BigInt values', () => {
      logger.setEnabled(true);

      const bigInt = BigInt(9007199254740991);
      logger.info('BigInt:', bigInt);

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'BigInt:', bigInt);
    });

    it('should handle Date objects', () => {
      logger.setEnabled(true);

      const date = new Date('2025-01-01');
      logger.info('Date:', date);

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Date:', date);
    });

    it('should handle RegExp objects', () => {
      logger.setEnabled(true);

      const regex = /test/gi;
      logger.info('Regex:', regex);

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Regex:', regex);
    });

    it('should handle Map and Set objects', () => {
      logger.setEnabled(true);

      const map = new Map([['key', 'value']]);
      const set = new Set([1, 2, 3]);

      logger.info('Map:', map);
      logger.info('Set:', set);

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Map:', map);
      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Set:', set);
    });

    it('should handle typed arrays', () => {
      logger.setEnabled(true);

      const uint8 = new Uint8Array([1, 2, 3]);
      logger.info('TypedArray:', uint8);

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'TypedArray:', uint8);
    });

    it('should handle Promise objects', () => {
      logger.setEnabled(true);

      const promise = Promise.resolve('test');
      logger.info('Promise:', promise);

      expect(consoleLogSpy).toHaveBeenCalledWith('[ContextTranslator]', 'Promise:', promise);
    });
  });
});
