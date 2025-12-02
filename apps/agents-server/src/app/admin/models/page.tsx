import { getSingleLlmExecutionTools } from '@promptbook-local/core';
import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { ModelsSection } from '../../../components/Homepage/ModelsSection';
import { $provideExecutionToolsForServer } from '../../../tools/$provideExecutionToolsForServer';
import { isUserAdmin } from '../../../utils/isUserAdmin';

export default async function AdminModelsPage() {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    const executionTools = await $provideExecutionToolsForServer();
    const models = await getSingleLlmExecutionTools(executionTools.llm).listModels();

    return (
        <div className="container mx-auto px-4 py-8">
            <ModelsSection models={models} />
        </div>
    );
}
