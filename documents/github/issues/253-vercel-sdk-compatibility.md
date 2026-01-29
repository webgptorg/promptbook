            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # Vercel SDK compatibility

            - Author: [hejny](https://github.com/hejny)
            - Created at: 4/23/2025, 2:58:44 PM
            - Updated at: 10/12/2025, 10:25:22 PM
            - Labels: Integration of Promptbook -> Adapter, Integration
            - Issue: #253

            Allow to expose Promptbook as Vercel SDK LLM provider

            ```typescript
            import { generateText } from 'ai';
            import { book } from '@promptbook/vercel';

            const { text } = await generateText({
              model: book('https://promptbook.studio/my-org/agent-007.book'),
              prompt: 'How many people will live in the world in 2040?',
            });
            ```


            ---

            *Note: Integration in oposite way is already implemented, Promptbook can use Vercel SDK LLM provider as its own through adapter*

            ## Comments

### Comment by hejny on 4/23/2025, 2:59:33 PM

@janbarasek @JorgeSquared Writing down what we have discussed today
