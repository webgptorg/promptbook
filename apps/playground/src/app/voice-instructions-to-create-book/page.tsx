import spaceTrim from 'spacetrim';
import { COMMITMENT_REGISTRY } from '../../../../../src/commitments';

export default function VoiceInstructionsToCreateBookPage() {
    const rules = spaceTrim(`

        ## Rules

        - Your task is to ask me for details about my knowledge domain
        - You are like a journalist interviewing an expert to gather information
        - After gathering enough information, you will create a book based on our conversation
        - Ask open-ended questions to get detailed responses
        - Focus on understanding the key concepts, terminology, and challenges in my domain
        - Take notes during our conversation to help you create the book later
        - Book is a specific format of text data used by Promptbook to define agent behavior, contexts, rules, knowledge,...
        - Book consists of name, and commitments
        - Output only valid book format, do not add any extra explanations, wrap the book in \`\`\`book ... \`\`\` code block
        - Do not use markdown in the book, only book commitments
        - I will converse with you by voice, then I will instruct you to create a book based on our conversation
        - Wait for my instruction to create the book

    `);

    const instructions = spaceTrim(
        (block) => `

            Based on following conversation, create a book:

            ${block(rules)}
            
            
            ## Sample of book:

            \`\`\`book
            Next Developer

            PERSONA You are Next Developer, an expert in Next.js development.
            Your task is to assist users in building web applications using Next.js by providing guidance, best practices, and code examples.
            RULE Use Typescript for all code examples.
            RULE Focus on creating MVPs quickly.
            KNOWLEDGE https://nextjs.org/
            
            \`\`\`

            *<- Note: First line is the name of the Agent, then COMMITMENT in uppercase and its contents in the following lines*

            ## Commitments

            ${block(
                COMMITMENT_REGISTRY.map((commitmentDefinition) =>
                    spaceTrim(
                        (block) => `
                            ### ${commitmentDefinition.type}

                            ${block(commitmentDefinition.description)}

                            \`\`\`markdown
                            ${block(commitmentDefinition.documentation.split('`').join('\\`'))}
                            \`\`\`
                        
                        `,
                    ),
                ).join('\n\n'),
                // <- TODO: Incrase the heading level not nest the block of `commitmentDefinition.documentation`
            )}

            ${block(rules)}

            **Now I will start a voice conversation with the agent and you will create a book based on it when I say so**
    
        `,
    );

    return (
        <div className="min-h-screen">
            <h1 className="text-2xl font-bold p-4">Book from voice</h1>
            <main className="h-[80vh]">
                <p className="p-4">Start a voice conversation with the agent with this initial prompt:</p>
                <textarea
                    className="w-full h-full p-2 border border-gray-300 rounded mb-4"
                    readOnly
                    value={instructions}
                />
            </main>
        </div>
    );
}
