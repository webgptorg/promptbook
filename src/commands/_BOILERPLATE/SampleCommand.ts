/**
 * Execute command tells how to execute the section
 * It can be either prompt template, script or SIMPLE TEMPLATE etc.
 */
export type SampleCommand = {
    readonly type: 'EXECUTE';
    readonly executionType: ExecutionType;
};
