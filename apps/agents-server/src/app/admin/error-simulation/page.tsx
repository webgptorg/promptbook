import spaceTrim from 'spacetrim';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { ErrorSimulationClient } from './ErrorSimulationClient';

/**
 * Query-string mode that intentionally crashes this page during server render.
 */
const SERVER_RENDER_THROW_MODE = 'server-render-throw';

/**
 * Props accepted by the hidden admin error simulation page.
 */
type ErrorSimulationPageProps = {
    /**
     * Query-string values passed from Next.js app router.
     */
    readonly searchParams?: Promise<{
        readonly mode?: string;
    }>;
};

/**
 * Determines whether server-render crash simulation is requested.
 *
 * @param mode - Query-string mode from request URL.
 * @returns `true` when this request should intentionally throw.
 */
function shouldTriggerServerRenderSimulation(mode: string | undefined): boolean {
    return mode === SERVER_RENDER_THROW_MODE;
}

/**
 * Hidden admin-only page used for testing error handling pathways.
 *
 * @param props - Next.js page props.
 * @returns Forbidden page for non-admins or the simulation UI for admins.
 */
export default async function ErrorSimulationPage({ searchParams }: ErrorSimulationPageProps) {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    const mode = (await searchParams)?.mode;
    if (shouldTriggerServerRenderSimulation(mode)) {
        throw new NotAllowed(
            spaceTrim(`
                [Error simulation] Intentional server-render failure was triggered on \`/admin/error-simulation\`.

                This crash is expected and exists only for validating error boundaries, logging, and monitoring.
            `),
        );
    }

    return <ErrorSimulationClient />;
}
