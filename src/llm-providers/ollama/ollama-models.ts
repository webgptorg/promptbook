import type { AvailableModel } from '../../execution/AvailableModel';
import { exportJson } from '../../utils/serialization/exportJson';

/**
 * List of available models in Ollama library
 *
 * Note: Synced with official API docs at 2025-08-17
 *
 * @see https://ollama.com/library
 * @public exported from `@promptbook/ollama`
 */
export const OLLAMA_MODELS: ReadonlyArray<AvailableModel> = exportJson({
    name: 'OLLAMA_MODELS',
    value: [
        {
            modelVariant: 'CHAT',
            modelTitle: 'llama3',
            modelName: 'llama3',
            modelDescription:
                'Meta Llama 3 (8B-70B parameters) with 8K context window. Latest generation foundation model with enhanced reasoning, instruction following, and factual accuracy. Superior performance to Llama 2 across all benchmarks with improved multilingual capabilities.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'llama3-chat',
            modelName: 'llama3-chat',
            modelDescription:
                'Meta Llama 3 Chat with 8K context window, fine-tuned specifically for dialogue with significantly improved instruction following. Features enhanced safety guardrails and reduced hallucinations. Recommended over Llama 2 Chat for all conversational applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'llama3-instruct',
            modelName: 'llama3-instruct',
            modelDescription:
                'Meta Llama 3 Instruct with 8K context window, fine-tuned for following specific instructions with precise outputs. Features improved structured response formatting and accurate completion of complex directives.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'codellama:13b',
            modelName: 'codellama:13b',
            modelDescription:
                'Meta CodeLlama 13B with 16K context window, specialized foundation model for code generation and understanding. Supports multiple programming languages with strong contextual code completion capabilities.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'codellama:34b',
            modelName: 'codellama:34b',
            modelDescription:
                'Meta CodeLlama 34B with 16K context window, larger code-specialized model with improved reasoning about complex programming tasks. Enhanced documentation generation and bug detection compared to smaller variants.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'phi3:mini',
            modelName: 'phi3:mini',
            modelDescription:
                'Microsoft Phi-3 Mini (3.8B parameters) with 4K context window, highly efficient small language model with remarkable reasoning given its size. Performs competitively with much larger models on common benchmarks. Excellent for resource-constrained environments.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'phi3:medium',
            modelName: 'phi3:medium',
            modelDescription:
                'Microsoft Phi-3 Medium (14B parameters) with 8K context window, balanced model offering strong performance with reasonable compute requirements. Features improved reasoning and factuality compared to Mini variant while maintaining efficiency.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mistral-nemo',
            modelName: 'mistral-nemo',
            modelDescription:
                'Mistral NeMo with 32K context window, open-source model optimized for enterprise use cases with improved reasoning and knowledge capabilities. Features strong performance on professional and domain-specific tasks.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'llama2',
            modelName: 'llama2',
            modelDescription:
                'Meta Llama 2 (7B-70B parameters) with 4K context window. General-purpose foundation model balancing performance and efficiency for text generation and reasoning tasks. Suitable for most non-specialized applications. Note: Superseded by Llama 3 models which offer better performance.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'llama2-chat',
            modelName: 'llama2-chat',
            modelDescription:
                'Meta Llama 2 Chat with 4K context window, fine-tuned specifically for conversational AI. Enhanced instruction following and safer responses compared to base model. Ideal for chatbots and interactive applications. Note: Consider using newer Llama 3 Chat for improved performance.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'alpaca-7b',
            modelName: 'alpaca-7b',
            modelDescription:
                'Stanford Alpaca 7B with 2K context window, instruction-tuned LLaMA model focused on following specific directions. Optimized for resource efficiency while maintaining good response quality. Suitable for lightweight applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'alpaca-30b',
            modelName: 'alpaca-30b',
            modelDescription:
                'Stanford Alpaca 30B with 2K context window. Larger instruction-tuned LLaMA model with improved reasoning and content generation capabilities. Better performance than 7B variant but requires more computational resources.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'vicuna-13b',
            modelName: 'vicuna-13b',
            modelDescription:
                'Vicuna 13B with 2K context window, fine-tuned from LLaMA for chat and instruction following. Known for balanced performance, good conversational abilities, and improved helpfulness over base models. Popular for diverse conversational applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'falcon-7b',
            modelName: 'falcon-7b',
            modelDescription:
                'Falcon 7B with 2K context window, performant open large language model trained on 1.5 trillion tokens. Strong on general knowledge tasks with smaller computational requirements. Good balance of performance and efficiency.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'falcon-40b',
            modelName: 'falcon-40b',
            modelDescription:
                'Falcon 40B with 2K context window, larger open large language model with enhanced reasoning and knowledge capabilities. Significantly better performance than 7B version but requires substantially more resources. Suitable for complex generation tasks.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'bloom-7b',
            modelName: 'bloom-7b',
            modelDescription:
                'BLOOM 7B with 2K context window, multilingual large language model supporting 46+ languages. Trained for diverse linguistic capabilities across languages. Especially useful for non-English or multilingual applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mistral-7b',
            modelName: 'mistral-7b',
            modelDescription:
                'Mistral 7B with 8K context window, efficient and fast open LLM with performance rivaling much larger models. Features Grouped-Query Attention for faster inference. Excellent balance of quality and speed for various applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'gorilla',
            modelName: 'gorilla',
            modelDescription:
                'Gorilla with 4K context window, specialized open-source LLM for tool use and API interaction. Fine-tuned to understand and generate API calls accurately. Optimal for agent applications that interact with external tools and services.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'cerebras-13b',
            modelName: 'cerebras-13b',
            modelDescription:
                'Cerebras-GPT 13B with 2K context window, trained on diverse high-quality datasets. Good general-purpose capabilities with particular strengths in factual response accuracy. Well-suited for applications requiring reliable information.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'openchat-7b',
            modelName: 'openchat-7b',
            modelDescription:
                'OpenChat 7B with 4K context window, optimized for conversational abilities and instruction following. Outperforms many larger models on benchmark tasks while maintaining efficiency. Ideal for interactive applications with limited resources.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'openchat-13b',
            modelName: 'openchat-13b',
            modelDescription:
                'OpenChat 13B with 4K context window, larger conversational LLM with enhanced reasoning, helpfulness, and knowledge. Significant improvement over 7B variant in complex tasks and nuanced conversations. Well-balanced for most conversational applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mpt-7b-chat',
            modelName: 'mpt-7b-chat',
            modelDescription:
                'MPT-7B Chat with 4K context window (extendable to 65K+), optimized for dialogue using high-quality conversation data. Features enhanced conversational abilities with strong safety alignments. Good for deployment in public-facing chat applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mpt-7b-instruct',
            modelName: 'mpt-7b-instruct',
            modelDescription:
                'MPT-7B Instruct with 4K context window (extendable to 65K+), instruction-tuned variant optimized for following specific directives. Better than chat variant for single-turn instruction tasks. Well-suited for content generation and task completion.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'command-7b',
            modelName: 'command-7b',
            modelDescription:
                'Command 7B with 4K context window, instruction-following LLM tuned specifically for direct command execution and helpful responses. Optimized for clarity of outputs and following explicit directions. Good for practical task-oriented applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'starcoder',
            modelName: 'starcoder',
            modelDescription:
                'StarCoder with 8K context window, specialized code generation large language model trained on permissively licensed code. Supports 80+ programming languages. Optimized for code completion, generation, and understanding tasks.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'starcoder2',
            modelName: 'starcoder2',
            modelDescription:
                'StarCoder2 with 16K context window, improved code generation model with better reasoning about code, debugging capabilities, and documentation generation. Supports 600+ programming languages. Ideal for complex software development assistance.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mixtral-7b-chat',
            modelName: 'mixtral-7b-chat',
            modelDescription:
                'Mixtral 7B Chat with 32K context window, Mixture-of-Experts conversational model with strong performance across diverse tasks. Efficiently routes inputs to specialized sub-networks for optimal processing. Well-balanced for most chat applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mixtral-8x7b',
            modelName: 'mixtral-8x7b',
            modelDescription:
                'Mixtral 8x7B with 32K context window, advanced Mixture-of-Experts architecture using 8 expert networks of 7B parameters each. Competitive with much larger dense models while using less computation. Excellent general-purpose capabilities.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mixtral-8x7b-instruct',
            modelName: 'mixtral-8x7b-instruct',
            modelDescription:
                'Mixtral 8x7B Instruct with 32K context window, instruction-tuned Mixture-of-Experts model for direct task execution. Enhanced directive following and more structured outputs compared to base model. Optimal for specific instruction-based workloads.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'neural-chat',
            modelName: 'neural-chat',
            modelDescription:
                'Intel Neural Chat (latest) with 8K context window, optimized for Intel hardware with efficient inference. Balanced model for general-purpose conversational applications with good instruction following capabilities.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'qwen:7b',
            modelName: 'qwen:7b',
            modelDescription:
                'Alibaba Qwen 7B with 8K context window. Versatile model with strong multilingual capabilities, particularly for Chinese and English. Features good reasoning and knowledge across diverse domains.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'qwen:14b',
            modelName: 'qwen:14b',
            modelDescription:
                'Alibaba Qwen 14B with 8K context window. Enhanced version with improved reasoning and knowledge capabilities. Particularly strong in multilingual applications and domain-specific tasks requiring deeper understanding.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'gemma:2b',
            modelName: 'gemma:2b',
            modelDescription:
                'Google Gemma 2B with 8K context window. Lightweight but capable model designed for efficiency. Good performance for its size on common tasks, ideal for resource-constrained environments and quick responses.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'gemma:7b',
            modelName: 'gemma:7b',
            modelDescription:
                'Google Gemma 7B with 8K context window. Well-balanced model offering strong performance across general tasks while maintaining reasonable resource requirements. Good alternative to similar-sized models with competitive capabilities.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'dolphin-mixtral',
            modelName: 'dolphin-mixtral',
            modelDescription:
                'Dolphin Mixtral with 32K context window. Community-tuned version of Mixtral with enhanced instruction following and creative capabilities. Maintains the MoE architecture while improving conversational abilities and reducing hallucinations.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'yi:34b-chat',
            modelName: 'yi:34b-chat',
            modelDescription:
                'Yi 34B Chat with 4K context window. Large bilingual model with exceptional English and Chinese capabilities. Strong performance on reasoning, knowledge, and instruction following tasks that competes with much larger commercial models.',
        },

        // <- [🕕]
    ],
});

/**
 * TODO: [🚸] Not all models are compatible with JSON mode, add this information here and use it
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
