import { string_name, string_title } from './typeAliases';

export type TaskProgress = PendingTaskProgress | DoneTaskProgress;

export interface PendingTaskProgress {
    readonly name: string_name;
    readonly title: string_title;
    readonly isDone: false;
}

export interface DoneTaskProgress {
    readonly name: string_name;
    readonly title?: string_title;
    readonly isDone: true;
}
