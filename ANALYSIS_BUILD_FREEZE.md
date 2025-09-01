# Build Process Freeze Analysis - @promptbook/wizard Package

## Problem Summary
The build process sometimes freezes during the `@promptbook/wizard` package generation, specifically after the rollup bundling completes. The issue is intermittent and takes up to an hour locally but only 5-6 minutes on GitHub Actions.

## Root Causes Identified

### 1. **Memory Pressure and Garbage Collection Issues**
- The wizard package is the largest and most complex package with 28+ dependencies
- Uses `--max-old-space-size=32000` (32GB) which may cause GC thrashing
- Large dependency tree creates memory pressure during bundling

### 2. **Circular Dependencies**
From the console output, there are multiple circular dependencies:
```
src/execution/createPipelineExecutor/00-createPipelineExecutor.ts -> 
src/execution/createPipelineExecutor/10-executePipeline.ts -> 
src/prepare/preparePipeline.ts -> 
src/execution/createPipelineExecutor/00-createPipelineExecutor.ts
```

### 3. **Complex Dependency Graph**
The wizard package imports from:
- All LLM providers (Anthropic, OpenAI, Azure, Google, Deepseek, Ollama)
- All scrapers (Document, PDF, Website, Markdown, etc.)
- Core execution engine
- File system operations
- Network operations

### 4. **Rollup Configuration Issues**
- Missing proper external configuration for Node.js built-ins
- Warnings about unresolved dependencies and missing global variables
- Use of `eval` in JavaScript execution tools

### 5. **Process Hanging After Completion**
The build completes successfully but the process doesn't exit cleanly, suggesting:
- Unclosed file handles
- Active timers or intervals
- Pending promises
- Event listeners not cleaned up

## Proposed Solutions

### Immediate Fixes

#### 1. **Reduce Memory Allocation**
```bash
# Instead of 32GB, use a more reasonable amount
node --max-old-space-size=8000 ./node_modules/rollup/dist/bin/rollup --config rollup.config.js
```

#### 2. **Add Process Timeout**
```javascript
// In generate-packages.ts, add timeout for rollup execution
await $execCommand({
    isVerbose: true,
    command: `timeout 600 node --max-old-space-size=8000 ./node_modules/rollup/dist/bin/rollup --config rollup.config.js`,
    // 10 minute timeout
});
```

#### 3. **Split Wizard Package**
Break the wizard package into smaller chunks:
- `@promptbook/wizard-core` - Basic wizard functionality
- `@promptbook/wizard-providers` - LLM providers
- `@promptbook/wizard-scrapers` - Document scrapers

#### 4. **Improve Rollup Configuration**
```javascript
// In rollup.config.js, add better external handling
external: [
    'fs', 'path', 'crypto', 'http', 'https', 'url', 'stream',
    'child_process', 'os', 'util', 'events', 'buffer'
],
```

### Long-term Solutions

#### 1. **Fix Circular Dependencies**
- Refactor `createPipelineExecutor` to break circular imports
- Use dependency injection pattern
- Create interface abstractions

#### 2. **Optimize Bundle Strategy**
- Use dynamic imports for heavy dependencies
- Implement lazy loading for scrapers and providers
- Consider using Webpack instead of Rollup for complex packages

#### 3. **Add Build Monitoring**
```javascript
// Add progress reporting and health checks
const buildTimeout = setTimeout(() => {
    console.error('Build process timed out after 10 minutes');
    process.exit(1);
}, 10 * 60 * 1000);

// Clear timeout when build completes
clearTimeout(buildTimeout);
```

#### 4. **Environment-Specific Builds**
- Different build strategies for local vs CI
- Skip heavy packages in development builds
- Use incremental building

## Implementation Priority

1. **High Priority** - Reduce memory allocation and add timeout
2. **Medium Priority** - Fix circular dependencies
3. **Low Priority** - Split wizard package (breaking change)

## Testing Strategy

1. Test with reduced memory allocation
2. Monitor build times and success rates
3. Test on different environments (local, CI, different OS)
4. Add build health checks and monitoring
