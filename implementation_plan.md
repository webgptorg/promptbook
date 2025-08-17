# Implementation Plan

[Overview]
Implement unified, configurable logging for the Promptbook engine, controlled by a single environment variable, using a structured JSON format and supporting log levels. This will replace all direct console usage in the engine (excluding playground and servicing scripts).

The goal is to standardize logging across all engine services, making logs easy to parse and control via environment configuration. This improves observability, debugging, and integration with external log management systems. The logger will be a singleton, ensuring consistent behavior and configuration throughout the engine.

[Types]
Introduce a LoggerOptions type and LogLevel enum for configuration.

```typescript
export type LoggerOptions = {
    enabled: boolean;
    level: LogLevel;
    format: 'json';
};

export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug',
}
```

[Files]
Create and modify files to implement logging.

- New files:
    - src/logger.ts: Implements the logger singleton, environment variable parsing, log formatting, and log level filtering.
- Modified files:
    - src/execution/createPipelineExecutor/00-createPipelineExecutor.ts
    - src/execution/createPipelineExecutor/30-executeFormatSubvalues.ts
    - src/execution/createPipelineExecutor/40-executeAttempts.ts
    - src/execution/createPipelineExecutor/getReservedParametersForTask.ts
    - src/execution/createPipelineExecutor/getKnowledgeForTask.ts
    - src/execution/createPipelineExecutor/20-executeTask.ts
    - src/config.ts (if global config is needed)
    - Any other engine files using console logging.
- No deletions or moves.
- Update docker-compose.yml and README.md to document the new environment variable.

[Functions]
Add and refactor functions for logging.

- New functions:
    - Logger.log(level: LogLevel, message: string, meta?: object): void (src/logger.ts)
    - Logger.error, Logger.warn, Logger.info, Logger.debug convenience methods.
- Modified functions:
    - All functions using console.log, console.error, console.warn, console.info in engine files will be refactored to use Logger.
- No removals.

[Classes]
Add a singleton Logger class.

- New classes:
    - Logger (src/logger.ts): Handles configuration, formatting, and output.
- Modified classes:
    - Any classes in engine files that previously used console logging.
- No removals.

[Dependencies]
Add optional dependency for structured logging if needed.

- Consider using a lightweight logging library (e.g., pino, winston) for JSON formatting, or implement formatting manually.
- No breaking changes to existing dependencies.

[Testing]
Add and update tests to validate logging.

- New test file: src/logger.test.ts (unit tests for Logger)
- Update engine tests to verify logging output and configuration.
- Validate log level filtering and environment variable control.

[Implementation Order]
Implement changes in the following order.

1. Create src/logger.ts with Logger class, options, and environment variable parsing.
2. Refactor engine files to replace console usage with Logger.
3. Update docker-compose.yml and README.md to document logging configuration.
4. Add and update tests for logger and engine logging.
5. Validate logging in Docker and local environments.
