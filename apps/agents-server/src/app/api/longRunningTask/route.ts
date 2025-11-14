import { NextResponse } from 'next/server';
import { getLongRunningTask } from '../../../deamons/longRunningTask';

export function GET() {
    const task = getLongRunningTask();
    return NextResponse.json(task);
}
