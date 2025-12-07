'use client';

import { CodePreview } from '../../../../../../_common/components/CodePreview/CodePreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../../_common/components/Tabs/Tabs';

type SdkCodeTabsProps = {
    curlCode: string;
    pythonCode: string;
    jsCode: string;
};

export function SdkCodeTabs({ curlCode, pythonCode, jsCode }: SdkCodeTabsProps) {
    return (
        <Tabs defaultValue="curl" className="w-full">
            <TabsList>
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="python">Python SDK</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript/TypeScript SDK</TabsTrigger>
            </TabsList>
            <TabsContent value="curl">
                <CodePreview code={curlCode} language="bash" />
            </TabsContent>
            <TabsContent value="python">
                <CodePreview code={pythonCode} language="python" />
            </TabsContent>
            <TabsContent value="javascript">
                <CodePreview code={jsCode} language="typescript" />
            </TabsContent>
        </Tabs>
    );
}
