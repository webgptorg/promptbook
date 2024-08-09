/**
 * ExecutionReport is result of executing one promptbook
 * It is kind of a variant of the promptbook usefull for debugging, logging and transparency for users.
 *
 * It can have 2 formats:
 * -   _(this)_ **.md file** created from the **JSON** format
 * -   **JSON** format
 *
 * @see https://github.com/webgptorg/promptbook#execution-report
 */
export type ExecutionReportString = string & {
    readonly _type: 'ExecutionReportString';
};
/**
 * TODO: Better validation or remove branded type and make it just string
 */
