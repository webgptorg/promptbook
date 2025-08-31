import colors from 'colors';
import prompts from 'prompts';
import spaceTrim from 'spacetrim';
import { forTime } from 'waitasecond';
import { assertsError } from '../../errors/assertsError';
import type { PipelineExecutor } from '../../execution/PipelineExecutor';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import { just } from '../../utils/organization/just';

/**
 * Options for running the interactive chatbot
 */
type RunInteractiveChatbotOptions = {
    /**
     * Prepared pipeline to run
     */
    pipeline: PipelineJson;

    /**
     * Prepared pipeline executor
     */
    pipelineExecutor: PipelineExecutor;

    /**
     * Whether to show verbose output
     */
    isVerbose: boolean;
};

/**
 * Run the interactive chatbot in CLI
 *
 * @returns Never-ending promise or process exit
 * @private internal function of `promptbookCli` and `initializeRunCommand`
 */
export async function runInteractiveChatbot(options: RunInteractiveChatbotOptions): Promise<void | never> {
    const { pipeline, pipelineExecutor, isVerbose } = options;

    let ongoingParameters = {
        /**
         * Title of the conversation
         */
        title: '',

        /**
         * Summary of the conversation
         */
        conversationSummary: '',

        /**
         * Chatbot response
         */
        chatbotResponse: '',
    };

    if (isVerbose) {
        console.info(colors.gray('--- Running interactive chatbot ---'));
    }

    const initialMessage = (pipeline.parameters.find(({ name }) => name === 'chatbotResponse')?.exampleValues || [])[0];

    if (initialMessage) {
        console.info(`\n`);
        console.info(
            spaceTrim(
                (block) => `

                    ${colors.bold(colors.green('Chatbot:'))}
                    ${block(colors.green(initialMessage))}

                `,
            ),
        );
    }

    while (just(true)) {
        try {
            await forTime(100);

            const { title, conversationSummary } = ongoingParameters;

            console.info(`\n`);
            if (
                title !== '' &&
                just(false) /* <- TODO: [⛲️] Some better way how to show the title of ongoing conversation */
            ) {
                console.info(colors.gray(`--- ${title} ---`));
            } else {
                console.info(colors.gray(`---`));
            }

            const response = await prompts({
                type: 'text',
                name: 'userMessage',
                message: 'User message',
                hint: spaceTrim(
                    (block) => `
                        Type "exit" to exit,

                        previousTitle
                        ${block(title)}

                        previousConversationSummary
                        ${block(conversationSummary)}

                    `,
                ),
            });

            const { userMessage } = response;

            if (userMessage === 'exit' || userMessage === 'quit' || userMessage === undefined) {
                return process.exit(0);
            }

            console.info(`\n`);
            console.info(
                spaceTrim(
                    (block) => `

                        ${colors.bold(colors.blue('User:'))}
                        ${block(colors.blue(userMessage))}

                    `,
                ),
            );

            const inputParameters = {
                previousTitle: title,

                previousConversationSummary: conversationSummary,
                userMessage,
            };

            const result = await pipelineExecutor(inputParameters).asPromise({ isCrashedOnError: true });

            console.info(`\n`);
            console.info(
                spaceTrim(
                    (block) => `

                        ${colors.bold(colors.green('Chatbot:'))}
                        ${block(colors.green(result.outputParameters.chatbotResponse!))}

                    `,
                ),
            );

            ongoingParameters = result.outputParameters as typeof ongoingParameters;
        } catch (error) {
            assertsError(error);

            // TODO: Allow to resurrect the chatbot after an error - prompt the user to continue
            console.error(colors.red(error.stack || error.message));
            return process.exit(1);
        }
    }
}

/**
 * TODO: Saving reports from the chatbot conversation
 * TODO: [⛲️] This is the right place to start implementing INK
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
