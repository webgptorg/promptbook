'use client';

import { CodePreview } from '../../../../../../_common/components/CodePreview/CodePreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../../_common/components/Tabs/Tabs';

/**
 * Props for PromptbookSdkTabs component.
 */
type PromptbookSdkTabsProps = {
    nodeCode: string;
    browserCode: string;
};

/**
 * Renders the Promptbook SDK integration code snippets.
 */
export function PromptbookSdkTabs({ nodeCode, browserCode }: PromptbookSdkTabsProps) {
    return (
        <Tabs defaultValue="node" className="w-full">
            <TabsList>
                <TabsTrigger value="node">Simple (Node.js)</TabsTrigger>
                <TabsTrigger value="browser">Browser (React)</TabsTrigger>
            </TabsList>
            <TabsContent value="node">
                <CodePreview code={nodeCode} language="typescript" />
            </TabsContent>
            <TabsContent value="browser">
                <CodePreview code={browserCode} language="tsx" />
            </TabsContent>
        </Tabs>
    );
}
