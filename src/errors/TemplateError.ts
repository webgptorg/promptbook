/**
 * This error occurs during the parameter replacement in the template
 *
 * Note: This is a kindof subtype of PromptbookExecutionError because it occurs during the execution of the pipeline
 */
export class TemplateError extends Error {
    public readonly name = 'TemplateError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, TemplateError.prototype);
    }
}
