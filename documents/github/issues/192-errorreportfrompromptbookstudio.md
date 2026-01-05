            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 🐜+Error+report+from+Promptbook.Studio

            - Author: [JorgeSquared](https://github.com/JorgeSquared)
            - Created at: 12/23/2024, 1:03:21 PM
            - Updated at: 12/27/2024, 5:35:49 PM
            - Labels:
            - Issue: #192

            `ParseError`+has+occurred+in+the+[Promptbook.Studio](https://promptbook.studio/),+please+look+into+it+@hejny.

            ```
            Can+not+extract+variables+from+the+script

            SyntaxError:+Unexpected+string+literal+'t+=+'.+const+declared+variable+'Can'+must+have+an+initializer.}


            Found+variables:

            1)+Can't


            The+script:

            ```javascript
            let+preprocessedText+=+inputText;
            preprocessedText+=+preprocessedText.split('\n\n\n').join('\n\n');
            preprocessedText+=+preprocessedText.split('\n\n\n').join('\n\n');
            preprocessedText+=+preprocessedText.split('\n\n\n').join('\n\n');

            preprocessedText+=+preprocessedText.split('pomlčka').join('–⁠');

            return+preprocessedText;
            ```
            ```


            ##+More+info:

            -+**App+version:**+1.9.2
            -+**Promptbook+engine+version:**+0.78.1
            -+**Book+language+version:**+1.0.0
            -+**URL:**+https://promptbook.studio/embed/code-miniapp?integrationId=1239a0ee-02bd-4aa8-98d2-0dc7a2eb2612&book=miniapps-collection/new
            -+**User+agent:**+Mozilla/5.0+(iPhone;+CPU+iPhone+OS+18_1_1+like+Mac+OS+X)+AppleWebKit/605.1.15+(KHTML,+like+Gecko)+CriOS/131.0.6778.154+Mobile/15E148+Safari/604.1
            -+**Time:**+2024-12-23T12:00:42.195Z
            -+**Client+ID:**+d3ef9f0c-608e-4c22-bbf8-36ece4655789
            -+**Client+Email:**+null


            <details>
            <summary>Stack+trace:</summary>

            ##+Stack+trace:

            ```stacktrace
            ParseError@https://promptbook.studio/_next/static/chunks/a583b46c-98b02210012a2427.js:1:11810
            extractVariablesFromScript@https://promptbook.studio/_next/static/chunks/a583b46c-98b02210012a2427.js:1:54481
            extractParameterNamesFromTask@https://promptbook.studio/_next/static/chunks/a583b46c-98b02210012a2427.js:1:55662
            _loop_2@https://promptbook.studio/_next/static/chunks/a583b46c-98b02210012a2427.js:1:164408
            pipelineStringToJsonSync@https://promptbook.studio/_next/static/chunks/a583b46c-98b02210012a2427.js:1:164846
            fromMarkdown@https://promptbook.studio/_next/static/chunks/1264-6d484e64dac2f645.js:1:73001
            getInitialPromptbookStudioStore@https://promptbook.studio/_next/static/chunks/1264-6d484e64dac2f645.js:1:11842
            @https://promptbook.studio/_next/static/chunks/1264-6d484e64dac2f645.js:1:62988
            useStateWithDeps@https://promptbook.studio/_next/static/chunks/1127-216f9353f55019f2.js:126:3946
            useStateInLocalstorage@https://promptbook.studio/_next/static/chunks/3049-7c1546fb0c5b3032.js:1:13012
            useJsonStateInLocalstorage@https://promptbook.studio/_next/static/chunks/1264-6d484e64dac2f645.js:1:62965
            usePromptbookStudioStore@https://promptbook.studio/_next/static/chunks/1264-6d484e64dac2f645.js:1:61177
            usePromptbookStudioCollection@https://promptbook.studio/_next/static/chunks/1264-6d484e64dac2f645.js:1:61421
            usePromptbookStudioPipeline@https://promptbook.studio/_next/static/chunks/1264-6d484e64dac2f645.js:1:62055
            useCreateMiniappDependencies@https://promptbook.studio/_next/static/chunks/1264-6d484e64dac2f645.js:1:428
            CreateMiniappCode@https://promptbook.studio/_next/static/chunks/pages/embed/code-miniapp-5e4839d63ac6926c.js:9:24393
            Xh@https://promptbook.studio/_next/static/chunks/framework-5a861713c65e2e87.js:9:60993
            x@https://promptbook.studio/_next/static/chunks/framework-5a861713c65e2e87.js:9:119449
            Vk@https://promptbook.studio/_next/static/chunks/framework-5a861713c65e2e87.js:9:99133
            @https://promptbook.studio/_next/static/chunks/framework-5a861713c65e2e87.js:9:99001
            Jk@https://promptbook.studio/_next/static/chunks/framework-5a861713c65e2e87.js:9:99006
            Ok@https://promptbook.studio/_next/static/chunks/framework-5a861713c65e2e87.js:9:95764
            Hk@https://promptbook.studio/_next/static/chunks/framework-5a861713c65e2e87.js:9:94320
            J@https://promptbook.studio/_next/static/chunks/framework-5a861713c65e2e87.js:41:1365
            R@https://promptbook.studio/_next/static/chunks/framework-5a861713c65e2e87.js:41:1895
            ```
            </details>

            ## Comments

### Comment by hejny on 12/27/2024, 5:35:46 PM

solved
