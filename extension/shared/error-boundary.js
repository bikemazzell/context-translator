/**
 * Global error boundary for Context Translator
 * Catches unhandled errors and promise rejections
 *
 * @module shared/error-boundary
 */

import { logger } from './logger.js';

let errorBoundaryInitialized = false;

export function initializeErrorBoundary() {
  if (errorBoundaryInitialized) {
    return;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      logger.error('Unhandled error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });

      event.preventDefault();
    });

    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection:', {
        reason: event.reason,
        promise: event.promise
      });

      if (event.reason && event.reason.context) {
        logger.error('Error context:', event.reason.context);
      }

      event.preventDefault();
    });
  }

  errorBoundaryInitialized = true;
}
