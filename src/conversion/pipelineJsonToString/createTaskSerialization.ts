import type { PromptTaskJson } from '../../pipeline/PipelineJson/PromptTaskJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import { capitalize } from '../../utils/normalization/capitalize';

/**
 * Code fence language used when stringifying a pipeline task.
 *
 * @private internal type of `createTaskSerialization`
 */
type PipelineTaskContentLanguage = 'markdown' | 'text' | 'javascript' | 'typescript' | 'python' | '';

/**
 * All derived serialization details needed to render one task section.
 *
 * @private internal type of `createTaskSerialization`
 */
type TaskSerialization = {
    readonly commands: Array<string>;
    readonly contentLanguage: PipelineTaskContentLanguage;
};

/**
 * Collects all task-specific serialization details.
 *
 * @private internal utility of `pipelineJsonToString`
 */
export function createTaskSerialization(task: TaskJson): TaskSerialization {
    const taskTypeSerialization = createTaskTypeSerialization(task);

    return {
        commands: [
            ...taskTypeSerialization.commands,
            ...createJokerCommands(task),
            ...createPostprocessingCommands(task),
            ...createExpectationCommands(task),
            ...createFormatCommands(task),
        ],
        contentLanguage: taskTypeSerialization.contentLanguage,
    };
}

/**
 * Collects commands and content language driven by the task type.
 *
 * @private internal utility of `createTaskSerialization`
 */
function createTaskTypeSerialization(task: TaskJson): TaskSerialization {
    if (task.taskType === 'PROMPT_TASK') {
        return {
            commands: createPromptTaskCommands(task),
            contentLanguage: 'text',
        };
    }

    if (task.taskType === 'SIMPLE_TASK') {
        return {
            commands: ['SIMPLE TEMPLATE'],
            contentLanguage: 'text',
        };
    }

    if (task.taskType === 'SCRIPT_TASK') {
        return {
            commands: ['SCRIPT'],
            contentLanguage: task.contentLanguage || '',
        };
    }

    if (task.taskType === 'DIALOG_TASK') {
        return {
            commands: ['DIALOG'],
            contentLanguage: 'text',
        };
    }

    return {
        commands: [],
        contentLanguage: 'text',
    };
}

/**
 * Collects prompt-task-specific commands.
 *
 * @private internal utility of `createTaskSerialization`
 */
function createPromptTaskCommands(task: PromptTaskJson): Array<string> {
    const { modelName, modelVariant } = task.modelRequirements || {};
    const commands: Array<string> = [];

    // Note: Do nothing, it is default
    // commands.push(`PROMPT`);

    if (modelVariant) {
        commands.push(`MODEL VARIANT ${capitalize(modelVariant)}`);
    }

    if (modelName) {
        commands.push(`MODEL NAME \`${modelName}\``);
    }

    return commands;
}

/**
 * Collects joker commands.
 *
 * @private internal utility of `createTaskSerialization`
 */
function createJokerCommands(task: TaskJson): Array<string> {
    return task.jokerParameterNames?.map((joker) => `JOKER {${joker}}`) || [];
}

/**
 * Collects postprocessing commands.
 *
 * @private internal utility of `createTaskSerialization`
 */
function createPostprocessingCommands(task: TaskJson): Array<string> {
    return (
        task.postprocessingFunctionNames?.map(
            (postprocessingFunctionName) => `POSTPROCESSING \`${postprocessingFunctionName}\``,
        ) || []
    );
}

/**
 * Collects expectation commands.
 *
 * @private internal utility of `createTaskSerialization`
 */
function createExpectationCommands(task: TaskJson): Array<string> {
    if (!task.expectations) {
        return [];
    }

    return Object.entries(task.expectations).flatMap(([unit, expectation]) =>
        createExpectationCommandsForUnit(unit, expectation.min, expectation.max),
    );
}

/**
 * Collects expectation commands for a single unit.
 *
 * @private internal utility of `createTaskSerialization`
 */
function createExpectationCommandsForUnit(unit: string, min?: number, max?: number): Array<string> {
    if (min === max) {
        return [`EXPECT EXACTLY ${min} ${formatExpectationUnit(unit, min)}`];
    }

    const commands: Array<string> = [];

    if (min !== undefined) {
        commands.push(`EXPECT MIN ${min} ${formatExpectationUnit(unit, min)}`);
    }

    if (max !== undefined) {
        commands.push(`EXPECT MAX ${max} ${formatExpectationUnit(unit, max)}`);
    }

    return commands;
}

/**
 * Formats the expectation unit exactly as the legacy serializer does.
 *
 * @private internal utility of `createTaskSerialization`
 */
function formatExpectationUnit(unit: string, amount: number | undefined): string {
    return capitalize(unit + (amount! > 1 ? 's' : ''));
}

/**
 * Collects format commands.
 *
 * @private internal utility of `createTaskSerialization`
 */
function createFormatCommands(task: TaskJson): Array<string> {
    if (task.format === 'JSON') {
        // TODO: @deprecated remove
        return ['FORMAT JSON'];
    }

    return [];
}
