import { PromptbookAgent } from '@promptbook-local/components';

export default function TwoEditorsPage() {
    return (
        <div className="min-h-screen">
            <h1 className="text-2xl font-bold p-4">Some website</h1>
            <main className="h-[80vh]">
                <p className="p-4">
                    This is an example of embedding Promptbook Agent from one server into another website.
                </p>
            </main>

            <PromptbookAgent agentUrl="http://localhost:4440/benjamin-white" />
        </div>
    );
}
