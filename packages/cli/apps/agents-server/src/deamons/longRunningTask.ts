import { forTime } from 'waitasecond';
import { just } from '../../../../src/utils/organization/just';
import { $randomToken } from '../../../../src/utils/random/$randomToken';

let longRunningTask: {
    taskId: string;
    tick: number;
    createdAt: Date;
    updatedAt: Date;
} | null = null;

export function getLongRunningTask() {
    if (longRunningTask !== null) {
        return longRunningTask;
    }

    const taskId = $randomToken(8);
    let tick = 0;

    longRunningTask = {
        taskId,
        tick,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    (async () => {
        while (just(true)) {
            await forTime(1000);
            // console.log(`Long running task ${taskId} tick ${tick}`);
            longRunningTask.updatedAt = new Date();
            longRunningTask.tick = ++tick;
        }
    })();

    return longRunningTask;
}
