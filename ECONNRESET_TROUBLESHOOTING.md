# ECONNRESET Troubleshooting Guide

This document provides a systematic approach to resolve intermittent `ECONNRESET` errors in the build process, specifically affecting the test "should scrape simple information from a (legacy) .doc file".

## Confirmed Issue

-   **Error**: `read ECONNRESET` during HTTP requests to LLM APIs (OpenAI)
-   **Frequency**: Intermittent (sometimes passes, sometimes fails)
-   **Impact**: Build failures, test unreliability

## Root Cause Analysis

The error occurs during HTTP requests to external APIs (LLM providers) within tests. `ECONNRESET` indicates the remote server unexpectedly closed the TCP connection.

---

## Solutions to Try (Ranked by Priority)

<strike>

### 🔴 **HIGH PRIORITY - Quick Fixes** _<- Tryed but not working_

#### 1. **Jest Test Timeout Configuration**

**Issue**: Tests may timeout before network requests complete
**Solution**: Increase Jest timeout for network-dependent tests

```javascript
// In jest.config.js
module.exports = {
    testTimeout: 60000, // 60 seconds instead of default 5 seconds
    // OR for specific tests
};

// In test file
describe('legacy document tests', () => {
    jest.setTimeout(120000); // 2 minutes for this test suite
});
```

#### 2. **Node.js HTTP Agent Configuration**

**Issue**: Default HTTP agent may not handle connection pooling optimally
**Solution**: Configure custom HTTP agent with better settings

```javascript
// In OpenAiCompatibleExecutionTools.ts constructor
import https from 'https';
import http from 'http';

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});

// Pass to OpenAI client
this.client = new OpenAI({
  ...openAiOptions,
  httpAgent: openAiOptions.baseURL?.startsWith('https') ? httpsAgent : httpAgent,
  timeout: 60000,
  maxRetries: 3,
} as ClientOptions);
```

#### 3. **Reduce Test Concurrency**

**Issue**: Too many parallel network requests overwhelming connections
**Solution**: Limit Jest workers for network-heavy tests

```javascript
// In jest.config.js
module.exports = {
    maxWorkers: 1, // Run tests sequentially
    // OR
    maxWorkers: '50%', // Use half available CPU cores
};
```

#### 4. **Environment Variable for API Timeouts**

**Issue**: Different environments may need different timeout values
**Solution**: Add configurable timeouts via environment variables

```javascript
// In config.ts
export const API_REQUEST_TIMEOUT = parseInt(process.env.API_REQUEST_TIMEOUT || '60000');
export const API_CONNECT_TIMEOUT = parseInt(process.env.API_CONNECT_TIMEOUT || '10000');

// Usage in OpenAI client
timeout: API_REQUEST_TIMEOUT,
```

---

~~

</strike>

### 🟡 **MEDIUM PRIORITY - Configuration Improvements**

#### 5. **DNS Resolution Optimization**

**Issue**: DNS resolution failures or delays
**Solution**: Configure DNS settings and caching

```javascript
// In package.json scripts or environment
"test": "NODE_OPTIONS='--dns-result-order=ipv4first' jest"

// OR set environment variable
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first --max-old-space-size=4096';
```

#### 6. **OpenAI Client Retry Configuration**

**Issue**: OpenAI client not handling retries properly
**Solution**: Enhanced OpenAI client configuration

```javascript
this.client = new OpenAI({
    ...openAiOptions,
    maxRetries: 5,
    timeout: 90000,
    defaultHeaders: {
        Connection: 'keep-alive',
        'Keep-Alive': 'timeout=30, max=100',
    },
});
```

#### 7. **Test Environment Isolation**

**Issue**: Tests interfering with each other's network connections
**Solution**: Better test isolation and cleanup

```javascript
// In test files
afterEach(async () => {
    // Force garbage collection
    if (global.gc) {
        global.gc();
    }

    // Clear any pending timers
    jest.clearAllTimers();

    // Allow event loop to drain
    await new Promise((resolve) => setImmediate(resolve));
});

beforeAll(() => {
    // Set test-specific timeouts
    jest.setTimeout(180000); // 3 minutes
});
```

#### 8. **Connection Pool Management**

**Issue**: Connection pool exhaustion or stale connections
**Solution**: Better connection lifecycle management

```javascript
// Add connection cleanup in OpenAiCompatibleExecutionTools
private connectionCleanupInterval?: NodeJS.Timeout;

constructor() {
  // ... existing code

  // Cleanup stale connections periodically
  this.connectionCleanupInterval = setInterval(() => {
    if (this.client) {
      // Force connection cleanup (implementation depends on HTTP library)
    }
  }, 30000);
}

destroy() {
  if (this.connectionCleanupInterval) {
    clearInterval(this.connectionCleanupInterval);
  }
}
```

---

### 🟢 **LOW PRIORITY - Advanced Solutions**

#### 9. **Mock/Stub Network Calls in Tests**

**Issue**: Real network calls in tests are inherently unreliable
**Solution**: Mock external API calls for more stable testing

```javascript
// Create __mocks__/openai.js
const OpenAI = jest.fn().mockImplementation(() => ({
    chat: {
        completions: {
            create: jest.fn().mockResolvedValue({
                choices: [{ message: { content: 'Mocked response' } }],
                model: 'gpt-3.5-turbo',
                usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
            }),
        },
    },
}));

export default OpenAI;
```

#### 10. **Network Interface Optimization**

**Issue**: System-level network configuration problems
**Solution**: System network tuning

```bash
# Add to CI/testing environment
echo 'net.core.somaxconn = 1024' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 1024' >> /etc/sysctl.conf
echo 'net.core.netdev_max_backlog = 5000' >> /etc/sysctl.conf
sysctl -p
```

#### 11. **Request Rate Limiting**

**Issue**: Too many requests overwhelming the API endpoint
**Solution**: Implement more aggressive rate limiting

```javascript
// In OpenAiCompatibleExecutionTools constructor
this.limiter = new Bottleneck({
    minTime: 2000, // 2 seconds between requests (more conservative)
    maxConcurrent: 1, // Only 1 concurrent request
    reservoir: 10, // Max 10 requests
    reservoirRefreshAmount: 10,
    reservoirRefreshInterval: 60000, // Per minute
});
```

#### 12. **Circuit Breaker Pattern**

**Issue**: Failing fast on repeated network failures
**Solution**: Implement circuit breaker for external API calls

```javascript
class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = 0;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= 5) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + 60000; // 1 minute
    }
  }
}
```

---

### 🔵 **DIAGNOSTIC TOOLS**

#### 13. **Enhanced Logging and Monitoring**

**Solution**: Add comprehensive logging to understand failure patterns

```javascript
// Add to OpenAiCompatibleExecutionTools
private logNetworkEvent(event: string, details: any) {
  if (this.options.isVerbose || process.env.NODE_ENV === 'test') {
    console.log(`[NETWORK] ${new Date().toISOString()} - ${event}:`, JSON.stringify(details, null, 2));
  }
}

// Usage
this.logNetworkEvent('REQUEST_START', { url, method, headers });
this.logNetworkEvent('REQUEST_ERROR', { error: error.message, code: error.code, stack: error.stack });
```

#### 14. **Network Connectivity Test**

**Solution**: Add pre-test connectivity check

```javascript
async function checkNetworkConnectivity(): Promise<boolean> {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            timeout: 10000,
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        });
        return response.ok;
    } catch (error) {
        console.warn('Network connectivity check failed:', error.message);
        return false;
    }
}

// Use in tests
beforeAll(async () => {
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
        console.warn('Network connectivity issues detected, tests may be unstable');
    }
});
```

---

## Testing Strategy

### Phase 1: Quick Wins (Try First)

1. Increase Jest timeout to 120 seconds
2. Set Jest maxWorkers to 1
3. Configure custom HTTP agents
4. Add DNS optimization

### Phase 2: Configuration Improvements

5. Enhanced OpenAI client retry configuration
6. Better test isolation and cleanup
7. Connection pool management
8. Environment-specific timeouts

### Phase 3: Advanced Solutions (If Still Failing)

9. Mock network calls in tests
10. Implement circuit breaker
11. System-level network tuning
12. More aggressive rate limiting

### Phase 4: Long-term Stability

13. Enhanced monitoring and logging
14. Network connectivity pre-checks
15. Automated retry policies
16. Health check endpoints

---

## Environment Variables to Add

Create a `.env.test` file with:

```bash
# Network Configuration
API_REQUEST_TIMEOUT=90000
API_CONNECT_TIMEOUT=15000
NODE_OPTIONS=--dns-result-order=ipv4first --max-old-space-size=4096

# Jest Configuration
JEST_TIMEOUT=120000
JEST_MAX_WORKERS=1

# OpenAI Configuration
OPENAI_MAX_RETRIES=5
OPENAI_TIMEOUT=90000

# Debugging
VERBOSE_NETWORK_LOGGING=true
```

---

## Implementation Order

1. **Start with Jest configuration changes** (timeout, workers)
2. **Add HTTP agent configuration**
3. **Implement enhanced retry logic** (already done)
4. **Add environment variable controls**
5. **Implement logging for diagnosis**
6. **Try more advanced solutions if needed**

Each solution should be tested individually to identify which combination provides the most stability.
