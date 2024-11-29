import { CsvFormatError } from '../formats/csv/CsvFormatError';
import { AbstractFormatError } from './AbstractFormatError';
import { CollectionError } from './CollectionError';
import { EnvironmentMismatchError } from './EnvironmentMismatchError';
import { ExpectError } from './ExpectError';
import { KnowledgeScrapeError } from './KnowledgeScrapeError';
import { LimitReachedError } from './LimitReachedError';
import { MissingToolsError } from './MissingToolsError';
import { NotFoundError } from './NotFoundError';
import { NotYetImplementedError } from './NotYetImplementedError';
import { ParseError } from './ParseError';
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
    UnexpectedError,
    // TODO: [🪑]> VersionMismatchError,
} as const;

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
