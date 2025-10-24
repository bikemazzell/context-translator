/**
 * Tests for error boundary
 */

import { describe, it, expect, jest } from '@jest/globals';
import { initializeErrorBoundary } from '../shared/error-boundary.js';
import { logger } from '../shared/logger.js';

describe('Error Boundary', () => {
  it('should not crash when window is undefined', () => {
    delete global.window;
    const loggerInfoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    expect(() => {
      initializeErrorBoundary();
    }).not.toThrow();

    expect(loggerInfoSpy).toHaveBeenCalledWith('Error boundary initialized');
    loggerInfoSpy.mockRestore();
  });

  it('should handle error events when window is defined', () => {
    let errorHandler;
    const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    global.window = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'error') {
          errorHandler = handler;
        }
      })
    };

    initializeErrorBoundary();

    const errorEvent = {
      message: 'Test error',
      filename: 'test.js',
      lineno: 10,
      colno: 5,
      error: new Error('Test error'),
      preventDefault: jest.fn()
    };

    if (errorHandler) {
      errorHandler(errorEvent);

      expect(loggerErrorSpy).toHaveBeenCalledWith('Unhandled error:', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: errorEvent.error
      });
      expect(errorEvent.preventDefault).toHaveBeenCalled();
    }

    loggerErrorSpy.mockRestore();
    delete global.window;
  });

  it('should handle unhandled rejections when window is defined', () => {
    let rejectionHandler;
    const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    global.window = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'unhandledrejection') {
          rejectionHandler = handler;
        }
      })
    };

    initializeErrorBoundary();

    const testPromise = Promise.resolve();
    const rejectionEvent = {
      reason: 'Promise rejected',
      promise: testPromise,
      preventDefault: jest.fn()
    };

    if (rejectionHandler) {
      rejectionHandler(rejectionEvent);

      expect(loggerErrorSpy).toHaveBeenCalledWith('Unhandled promise rejection:', {
        reason: 'Promise rejected',
        promise: testPromise
      });
      expect(rejectionEvent.preventDefault).toHaveBeenCalled();
    }

    loggerErrorSpy.mockRestore();
    delete global.window;
  });

  it('should log error context if available in rejection', () => {
    let rejectionHandler;
    const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    global.window = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'unhandledrejection') {
          rejectionHandler = handler;
        }
      })
    };

    initializeErrorBoundary();

    const testPromise = Promise.resolve();
    const rejectionEvent = {
      reason: {
        message: 'Error with context',
        context: { foo: 'bar' }
      },
      promise: testPromise,
      preventDefault: jest.fn()
    };

    if (rejectionHandler) {
      rejectionHandler(rejectionEvent);

      expect(loggerErrorSpy).toHaveBeenCalledWith('Unhandled promise rejection:', {
        reason: rejectionEvent.reason,
        promise: testPromise
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error context:', { foo: 'bar' });
    }

    loggerErrorSpy.mockRestore();
    delete global.window;
  });
});
