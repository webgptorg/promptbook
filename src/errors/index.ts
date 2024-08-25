import { CollectionError } from './CollectionError';
import { EnvironmentMismatchError } from './EnvironmentMismatchError';
import { ExpectError } from './ExpectError';
import { LimitReachedError } from './LimitReachedError';
import { NotFoundError } from './NotFoundError';
import { NotYetImplementedError } from './NotYetImplementedError';
import { ParsingError } from './ParsingError';
import { PipelineExecutionError } from './PipelineExecutionError';
import { PipelineLogicError } from './PipelineLogicError';
import { PipelineUrlError } from './PipelineUrlError';
import { UnexpectedError } from './UnexpectedError';

/**
 * Index of all custom errors
 *
 * @public exported from `@promptbook/core`
 */
export const ERRORS = {
    ExpectError,
    CollectionError,
    EnvironmentMismatchError,
    LimitReachedError,
    NotFoundError,
    NotYetImplementedError,
    ParsingError,
    PipelineExecutionError,
    PipelineLogicError,
    PipelineUrlError,
    UnexpectedError,
    // TODO: [🪑]> VersionMismatchError,
} as const;
