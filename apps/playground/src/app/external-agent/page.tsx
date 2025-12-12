import { PromptbookAgentIntegration } from '@promptbook-local/components';

export default function TwoEditorsPage() {
    return (
        <div className="min-h-screen">
            <h1 className="text-2xl font-bold p-4">Some website</h1>
            <main className="h-[80vh]">
                <p className="p-4">
                    This is an example of embedding Promptbook Agent from one server into another website.
                </p>
            </main>

            <PromptbookAgentIntegration
                agentUrl="http://localhost:4440/benjamin-white"
                meta={{
                    image: 'https://www.pavolhejny.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fpavol-hejny-transparent.56d4a7a5.png&w=1920&q=75',
                    color: `#00FFFF`,
                }}
            />
        </div>
    );
}
