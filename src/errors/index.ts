import { CollectionError } from './CollectionError';
import { EnvironmentMismatchError } from './EnvironmentMismatchError';
import { LimitReachedError } from './LimitReachedError';
import { NotFoundError } from './NotFoundError';
import { NotYetImplementedError } from './NotYetImplementedError';
import { ParsingError } from './ParsingError';
import { PipelineExecutionError } from './PipelineExecutionError';
import { PipelineLogicError } from './PipelineLogicError';
import { ReferenceError } from './ReferenceError';
import { UnexpectedError } from './UnexpectedError';
import { VersionMismatchError } from './VersionMismatchError';

/**
 * Index of all custom errors
 *
 * @public exported from `@promptbook/core`
 */
export const ERRORS = {
    CollectionError,
    EnvironmentMismatchError,
    LimitReachedError,
    NotFoundError,
    NotYetImplementedError,
    ParsingError,
    PipelineExecutionError,
    PipelineLogicError,
    ReferenceError,
    UnexpectedError,
    VersionMismatchError,
} as const;
