import { NextRequest, NextResponse } from 'next/server';
import { createTranspiledAgentExportZipBuffer } from '../../../../../../utils/transpilers/createTranspiledAgentExportZipBuffer';
import {
    findBookTranspilerForExport,
    resolveTranspiledAgentCodeExport,
} from '../../../../../../utils/transpilers/resolveTranspiledAgentCodeExport';
import { getSignedInUserForAgentAccess } from '../../../../../../utils/agentAccess';

/**
 * ZIP export generation depends on live agent state and should not be statically cached.
 */
export const dynamic = 'force-dynamic';

/**
 * ZIP generation runs on the Node.js runtime.
 */
export const runtime = 'nodejs';

/**
 * Streams a ZIP archive containing the stored agent book and transpiled harness file.
 *
 * @param request - Incoming request carrying the selected transpiler in the query string.
 * @param context - Dynamic route params with the target agent name.
 * @returns ZIP download response or JSON error payload.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ agentName: string }> }) {
    if (!(await getSignedInUserForAgentAccess())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agentName = decodeURIComponent((await context.params).agentName);
    const transpilerName = request.nextUrl.searchParams.get('transpilerName');

    if (!transpilerName) {
        return NextResponse.json({ error: 'Transpiler name is required' }, { status: 400 });
    }

    const transpiler = findBookTranspilerForExport(transpilerName);
    if (!transpiler) {
        return NextResponse.json({ error: 'Transpiler not found' }, { status: 404 });
    }

    try {
        const exportPayload = await resolveTranspiledAgentCodeExport({
            agentName,
            localServerUrl: request.nextUrl.origin,
            transpiler,
        });

        if (!exportPayload) {
            return NextResponse.json({ error: 'Agent source not found' }, { status: 404 });
        }

        const { filename, buffer } = await createTranspiledAgentExportZipBuffer({
            agentName,
            agentSource: exportPayload.agentSource,
            transpiledCode: exportPayload.transpiledCode,
            transpilerName: exportPayload.transpiler.name,
            transpilerTitle: exportPayload.transpiler.title,
        });

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting transpiled code ZIP:', error);
        return NextResponse.json({ error: 'Failed to export transpiled code' }, { status: 500 });
    }
}
