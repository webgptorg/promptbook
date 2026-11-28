import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { SwaggerPageClient } from './SwaggerPageClient';

/**
 * Hosts the interactive Swagger UI backed by the runtime-generated `/openapi.json` document.
 */
export default async function SwaggerPage() {
    const admin = await isUserAdmin();
    return <SwaggerPageClient isAdmin={admin} />;
}
