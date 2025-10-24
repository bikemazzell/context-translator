/**
 * Custom error classes for Context Translator
 * Provides structured error handling with context
 *
 * @module shared/errors
 */

export class TranslationError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'TranslationError';
    this.context = context;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

export class ValidationError extends Error {
  constructor(message, field = null, value = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      field: this.field,
      value: this.value,
      timestamp: this.timestamp
    };
  }
}

export class NetworkError extends Error {
  constructor(message, endpoint = null, statusCode = null) {
    super(message);
    this.name = 'NetworkError';
    this.endpoint = endpoint;
    this.statusCode = statusCode;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      endpoint: this.endpoint,
      statusCode: this.statusCode,
      timestamp: this.timestamp
    };
  }
}

export class CacheError extends Error {
  constructor(message, operation = null) {
    super(message);
    this.name = 'CacheError';
    this.operation = operation;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      operation: this.operation,
      timestamp: this.timestamp
    };
  }
}
