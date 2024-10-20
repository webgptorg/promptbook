import type { ClientOptions } from 'openai';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { string_user_id } from '../../types/typeAliases';

/**
 * Options for `OpenAiExecutionTools`
 *
 * This extends OpenAI's `ClientOptions` with are directly passed to the OpenAI client.
 * Rest is used by the `OpenAiExecutionTools`.
 *
 * @public exported from `@promptbook/openai`
 */
export type OpenAiExecutionToolsOptions = CommonToolsOptions &
    ClientOptions & {
        /**
         * A unique identifier representing your end-user, which can help OpenAI to monitor
         * and detect abuse.
         *
         * @see https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids
         */
        userId: string_user_id | null;
        // <- TODO: [🧠][🤺] Maybe allow overriding of `userId` for each prompt
    };
