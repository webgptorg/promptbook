import { CsvFormatError } from '../formats/csv/CsvFormatError';
import { AbstractFormatError } from './AbstractFormatError';
import { AuthenticationError } from './AuthenticationError';
import { CollectionError } from './CollectionError';
import { ConflictError } from './ConflictError';
import { DatabaseError } from './DatabaseError';
import { EnvironmentMismatchError } from './EnvironmentMismatchError';
import { ExpectError } from './ExpectError';
import { KnowledgeScrapeError } from './KnowledgeScrapeError';
import { LimitReachedError } from './LimitReachedError';
import { MissingToolsError } from './MissingToolsError';
import { NotAllowed } from './NotAllowed';
import { NotFoundError } from './NotFoundError';
import { NotYetImplementedError } from './NotYetImplementedError';
import { ParseError } from './ParseError';
import { PipelineExecutionError } from './PipelineExecutionError';
import { PipelineLogicError } from './PipelineLogicError';
import { PipelineUrlError } from './PipelineUrlError';
import { PromptbookFetchError } from './PromptbookFetchError';
import { UnexpectedError } from './UnexpectedError';
import { WrappedError } from './WrappedError';

/**
 * Index of all custom errors
 *
 * @public exported from `@promptbook/core`
 */
export const PROMPTBOOK_ERRORS = {
    AbstractFormatError,
    CsvFormatError,
    CollectionError,
    EnvironmentMismatchError,
    ExpectError,
    KnowledgeScrapeError,
    LimitReachedError,
    MissingToolsError,
    NotFoundError,
    NotYetImplementedError,
    ParseError,
    PipelineExecutionError,
    PipelineLogicError,
    PipelineUrlError,
    AuthenticationError,
    PromptbookFetchError,
    UnexpectedError,
    WrappedError,
    NotAllowed,
    DatabaseError,
    ConflictError,
    // TODO: [🪑]> VersionMismatchError,
} as const;

/**
 * Index of all javascript errors
 *
 * @private for internal usage
 */
export const COMMON_JAVASCRIPT_ERRORS = {
    Error,
    EvalError,
    RangeError,
    ReferenceError,
    SyntaxError,
    TypeError,
    URIError,
    AggregateError,

    /*
  Note: Not widely supported
  > InternalError,
  > ModuleError,
  > HeapError,
  > WebAssemblyCompileError,
  > WebAssemblyRuntimeError,
  */
} as const;

/**
 * Index of all errors
 *
 * @private for internal usage
 */
export const ALL_ERRORS = {
    ...PROMPTBOOK_ERRORS,
    ...COMMON_JAVASCRIPT_ERRORS,
} as const;

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
