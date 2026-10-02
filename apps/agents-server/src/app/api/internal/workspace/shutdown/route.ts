import { NextResponse } from 'next/server';
import { isTimingSafeEqualString } from '../../../../../../../../src/utils/isTimingSafeEqualString';
import { resolveUserChatWorkerInternalToken } from '../../../../../utils/userChat';
import { $provideSupabaseForServer } from '../../../../../database/$provideSupabaseForServer';
import { $getTableName } from '../../../../../database/$getTableName';
import {
    isWorkspaceAgentStorage,
    provideWorkspaceAgentCollection,
} from '../../../../../utils/workspace/workspaceAgentStorage';
import { waitForWorkspaceChatWorkers } from '../../../../../utils/workspace/processWorkspaceUserChatJob';

/** Quiesces only this owned workspace app using the existing private worker token and cancellation machinery. */
export async function POST(request: Request) {
    if (
        !isWorkspaceAgentStorage() ||
        !isTimingSafeEqualString(request.headers.get('x-user-chat-worker-token'), resolveUserChatWorkerInternalToken())
    )
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    (await provideWorkspaceAgentCollection()).state.updateControl({ isStopping: true });
    await (
        await $provideSupabaseForServer()
    )
        .from(await $getTableName('UserChatJob'))
        .update({ cancelRequestedAt: new Date().toISOString() })
        .eq('status', 'RUNNING');
    await waitForWorkspaceChatWorkers();
    return NextResponse.json({ ok: true });
}
