/**
 * Promptbook is the **core concept of this package**.
 * It represents a series of tasks chained together to form a pipeline / one big task with input and result parameters.
 *
 * @see @@@ https://github.com/webgptorg/promptbook#promptbook
 */
export type PipelineString = string & {
    readonly _type: 'Promptbook' /* <- TODO: [🏟] What is the best shape of the additional object in branded types */;
};
