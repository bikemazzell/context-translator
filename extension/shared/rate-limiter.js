/**
 * Rate limiter for LLM requests
 * Prevents excessive API calls
 *
 * @module shared/rate-limiter
 */

export class RateLimiter {
  /**
   * Create rate limiter
   * @param {number} maxRequests - Maximum requests per window
   * @param {number} windowMs - Time window in milliseconds
   */
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  /**
   * Acquire permission to make a request
   * @throws {Error} If rate limit exceeded
   */
  async acquire() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      throw new Error(
        `Rate limit exceeded: ${this.maxRequests} requests per ${this.windowMs/1000}s. ` +
        `Please wait ${Math.ceil(waitTime/1000)} seconds.`
      );
    }

    this.requests.push(now);
  }

  /**
   * Reset rate limiter
   */
  reset() {
    this.requests = [];
  }

  /**
   * Get current request count
   * @returns {number} Number of requests in current window
   */
  getCount() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    return this.requests.length;
  }

  /**
   * Configure rate limiter with new settings
   * @param {number} maxRequests - Maximum requests per window
   * @param {number} windowMs - Time window in milliseconds (optional)
   */
  configure(maxRequests, windowMs = null) {
    if (typeof maxRequests === 'number' && maxRequests >= 1) {
      this.maxRequests = maxRequests;
    }
    if (typeof windowMs === 'number' && windowMs > 0) {
      this.windowMs = windowMs;
    }
  }
}
