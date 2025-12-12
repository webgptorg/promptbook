'use client';

import { CodePreview } from '../../../../../../_common/components/CodePreview/CodePreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../../_common/components/Tabs/Tabs';

type WebsiteIntegrationTabsProps = {
    reactCode: string;
    htmlCode: string;
};

export function WebsiteIntegrationTabs({ reactCode, htmlCode }: WebsiteIntegrationTabsProps) {
    return (
        <Tabs defaultValue="react" className="w-full">
            <TabsList>
                <TabsTrigger value="react">React</TabsTrigger>
                <TabsTrigger value="html">HTML</TabsTrigger>
            </TabsList>
            <TabsContent value="react">
                <CodePreview code={reactCode} language="typescript" />
            </TabsContent>
            <TabsContent value="html">
                <CodePreview code={htmlCode} language="xml" />
            </TabsContent>
        </Tabs>
    );
}
