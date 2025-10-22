/**
 * Retry Helper - Automatic Retry with Exponential Backoff
 * Handles transient failures in external services and network requests
 */

/**
 * Retry an async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry configuration
 * @returns {Promise} - Result of the operation
 */
export const retryWithBackoff = async (
  operation,
  options = {}
) => {
  const {
    maxRetries = 3,
    initialDelay = 1000, // 1 second
    maxDelay = 10000, // 10 seconds
    factor = 2, // Exponential factor
    onRetry = null // Callback for each retry
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry non-transient errors
      if (!isTransientError(error)) {
        throw error;
      }
      
      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(
        initialDelay * Math.pow(factor, attempt),
        maxDelay
      );
      
      // Add jitter (±25%) to prevent thundering herd
      const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
      const delay = Math.round(exponentialDelay + jitter);
      
      console.log(
        `⏱️  Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`,
        { error: error.message }
      );
      
      // Call retry callback if provided
      if (onRetry) {
        await onRetry(attempt + 1, delay, error);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries exhausted
  throw lastError;
};

/**
 * Determine if an error is transient (worth retrying)
 * @param {Error} error - Error to check
 * @returns {boolean} - True if error is transient
 */
export const isTransientError = (error) => {
  // Network errors (usually transient)
  const transientNetworkCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EHOSTUNREACH',
    'ECONNREFUSED',
    'EPIPE',
    'EAI_AGAIN'
  ];
  
  if (error.code && transientNetworkCodes.includes(error.code)) {
    return true;
  }
  
  // HTTP status codes that are worth retrying
  const transientStatusCodes = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
    522, // Connection Timed Out
    524  // A Timeout Occurred
  ];
  
  if (error.statusCode && transientStatusCodes.includes(error.statusCode)) {
    return true;
  }
  
  // Check error message for timeout keywords
  const timeoutKeywords = ['timeout', 'timed out', 'time out'];
  const errorMessage = (error.message || '').toLowerCase();
  
  if (timeoutKeywords.some(keyword => errorMessage.includes(keyword))) {
    return true;
  }
  
  // Database lock errors (transient in SQLite)
  if (errorMessage.includes('database is locked') || errorMessage.includes('SQLITE_BUSY')) {
    return true;
  }
  
  return false;
};

/**
 * Retry with specific configuration for database operations
 */
export const retryDatabase = (operation) => {
  return retryWithBackoff(operation, {
    maxRetries: 5,
    initialDelay: 100,
    maxDelay: 2000,
    factor: 1.5,
    onRetry: (attempt, delay, error) => {
      console.log(`📊 Database retry ${attempt}: ${error.message}`);
    }
  });
};

/**
 * Retry with specific configuration for API calls
 */
export const retryAPI = (operation) => {
  return retryWithBackoff(operation, {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    factor: 2,
    onRetry: (attempt, delay, error) => {
      console.log(`🌐 API retry ${attempt}: ${error.message}`);
    }
  });
};

/**
 * Retry with specific configuration for notifications
 */
export const retryNotification = (operation) => {
  return retryWithBackoff(operation, {
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 30000,
    factor: 2,
    onRetry: (attempt, delay, error) => {
      console.log(`📧 Notification retry ${attempt}: ${error.message}`);
    }
  });
};

/**
 * Circuit breaker pattern - stops retrying after too many failures
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }
  
  async execute(operation) {
    // If circuit is OPEN, fail fast
    if (this.state === 'OPEN') {
      // Check if we should try to reset
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log('🔄 Circuit breaker: HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }
    
    try {
      const result = await operation();
      
      // Success - handle state transition
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        
        // If we have enough successes, close the circuit
        if (this.successCount >= 3) {
          this.state = 'CLOSED';
          this.failures = 0;
          console.log('✅ Circuit breaker: CLOSED');
        }
      } else {
        // Reset failure count on success
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      // Check if we should open the circuit
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        console.log('🚨 Circuit breaker: OPEN');
      }
      
      throw error;
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
  
  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    console.log('♻️  Circuit breaker: RESET');
  }
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.queue = [];
  }
  
  async execute(operation) {
    const now = Date.now();
    
    // Remove old entries outside the window
    this.queue = this.queue.filter(time => now - time < this.windowMs);
    
    // Check if we've exceeded the limit
    if (this.queue.length >= this.maxRequests) {
      const oldestRequest = this.queue[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`);
    }
    
    // Add current request to queue
    this.queue.push(now);
    
    // Execute operation
    return await operation();
  }
  
  getStats() {
    const now = Date.now();
    const activeRequests = this.queue.filter(time => now - time < this.windowMs).length;
    
    return {
      activeRequests,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      availableSlots: this.maxRequests - activeRequests
    };
  }
}

export default {
  retryWithBackoff,
  isTransientError,
  retryDatabase,
  retryAPI,
  retryNotification,
  CircuitBreaker,
  RateLimiter
};
