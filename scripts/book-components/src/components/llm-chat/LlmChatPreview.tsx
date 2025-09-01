'use client';

import { useEffect, useMemo, useState } from 'react';
import { LlmChat } from '../../../../../src/book-components/Chat/LlmChat/LlmChat';
import type { ChatMessage } from '../../../../../src/book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../../../../../src/book-components/Chat/types/ChatParticipant';
import type { LlmExecutionTools } from '../../../../../src/execution/LlmExecutionTools';
import { $llmToolsMetadataRegister } from '../../../../../src/llm-providers/_common/register/$llmToolsMetadataRegister';
import { $llmToolsRegister } from '../../../../../src/llm-providers/_common/register/$llmToolsRegister';
import type { LlmToolsMetadata } from '../../../../../src/llm-providers/_common/register/LlmToolsMetadata';
import { MockedEchoLlmExecutionTools } from '../../../../../src/llm-providers/mocked/MockedEchoLlmExecutionTools';

const PROVIDER_CONFIG_STORAGE_KEY_PREFIX = 'llm-chat-preview-config-';

interface ProviderConfig {
    [key: string]: string;
}

interface ScenarioDefinition {
    name: string;
    description: string;
    llmTools: LlmExecutionTools | null;
    metadata?: LlmToolsMetadata;
    configFields?: Array<{
        key: string;
        label: string;
        type: 'text' | 'password';
        placeholder?: string;
        required?: boolean;
    }>;
}

export default function LlmChatPreview() {
    const [scenario, setScenario] = useState<string>('mock-basic');
    const [providerConfigs, setProviderConfigs] = useState<Record<string, ProviderConfig>>({});

    // Load provider configurations from localStorage on component mount
    useEffect(() => {
        const configs: Record<string, ProviderConfig> = {};
        const availableProviders = $llmToolsMetadataRegister.list();

        for (const provider of availableProviders) {
            const storageKey = `${PROVIDER_CONFIG_STORAGE_KEY_PREFIX}${provider.packageName}-${provider.className}`;
            const savedConfig = localStorage.getItem(storageKey);
            if (savedConfig) {
                try {
                    configs[`${provider.packageName}-${provider.className}`] = JSON.parse(savedConfig);
                } catch (error) {
                    console.warn(`Failed to parse saved config for ${provider.title}:`, error);
                }
            }
        }
        setProviderConfigs(configs);
    }, []);

    // Save provider configuration to localStorage
    const saveProviderConfig = (providerId: string, config: ProviderConfig) => {
        const storageKey = `${PROVIDER_CONFIG_STORAGE_KEY_PREFIX}${providerId}`;
        localStorage.setItem(storageKey, JSON.stringify(config));
        setProviderConfigs((prev) => ({ ...prev, [providerId]: config }));
    };

    // Create LLM tools from provider configuration
    const createLlmTools = (metadata: LlmToolsMetadata, config: ProviderConfig): LlmExecutionTools | null => {
        try {
            // Find the constructor in the register
            const constructors = $llmToolsRegister.list();
            const constructor = constructors.find(
                (c) => c.packageName === metadata.packageName && c.className === metadata.className,
            );

            if (!constructor) {
                console.warn(`No constructor found for ${metadata.title}`);
                return null;
            }

            // Create options object based on boilerplate configuration and user config
            const boilerplate = metadata.getBoilerplateConfiguration();
            const options = { ...boilerplate.options } as Record<string, unknown>;

            // Override with user configuration
            for (const [key, value] of Object.entries(config)) {
                if (value.trim()) {
                    options[key] = value;
                }
            }

            // Add browser-specific options if needed
            if (
                metadata.className === 'OpenAiExecutionTools' ||
                metadata.className === 'OpenAiCompatibleExecutionTools'
            ) {
                options.dangerouslyAllowBrowser = true;
            }

            return constructor(options);
        } catch (error) {
            console.error(`Failed to create LLM tools for ${metadata.title}:`, error);
            return null;
        }
    };

    // Get configuration fields for a provider
    const getConfigFields = (metadata: LlmToolsMetadata) => {
        const fields: Array<{
            key: string;
            label: string;
            type: 'text' | 'password';
            placeholder?: string;
            required?: boolean;
        }> = [];

        // Get boilerplate to understand what fields are needed
        const boilerplate = metadata.getBoilerplateConfiguration();
        const options = boilerplate.options as Record<string, unknown>;

        // Common field mappings
        if ('apiKey' in options) {
            fields.push({
                key: 'apiKey',
                label: 'API Key',
                type: 'password',
                placeholder: (options.apiKey as string) || 'Enter your API key...',
                required: true,
            });
        }

        if ('baseURL' in options && metadata.className === 'OpenAiCompatibleExecutionTools') {
            fields.push({
                key: 'baseURL',
                label: 'Base URL',
                type: 'text',
                placeholder: (options.baseURL as string) || 'https://api.openai.com/v1',
                required: false,
            });
        }

        if ('assistantId' in options) {
            fields.push({
                key: 'assistantId',
                label: 'Assistant ID',
                type: 'text',
                placeholder: (options.assistantId as string) || 'asst_...',
                required: true,
            });
        }

        return fields;
    };

    // Build scenarios dynamically
    const scenarios = useMemo((): Record<string, ScenarioDefinition> => {
        const mockedLlmTools = new MockedEchoLlmExecutionTools({ isVerbose: true });

        const scenarios: Record<string, ScenarioDefinition> = {
            'mock-basic': {
                name: 'Mocked Chat (No storage)',
                description: 'Simple chat with mocked echo LLM',
                llmTools: mockedLlmTools,
            },
            'mock-persistent': {
                name: 'Mocked Chat (Persistent)',
                description: 'Chat with mocked LLM and localStorage persistence - messages survive page refresh',
                llmTools: mockedLlmTools,
            },
        };

        // Add scenarios for each registered provider
        const availableProviders = $llmToolsMetadataRegister.list();
        for (const metadata of availableProviders) {
            const providerId = `${metadata.packageName}-${metadata.className}`;
            const config = providerConfigs[providerId] || {};
            const configFields = getConfigFields(metadata);

            // Check if all required fields are filled
            const hasRequiredConfig = configFields.every(
                (field) => !field.required || (config[field.key] && config[field.key].trim()),
            );

            const llmTools = hasRequiredConfig ? createLlmTools(metadata, config) : null;

            scenarios[providerId] = {
                name: metadata.title,
                description: `Chat with ${metadata.title} models`,
                llmTools,
                metadata,
                configFields,
            };

            // Add persistent version if tools are available
            if (llmTools) {
                scenarios[`${providerId}-persistent`] = {
                    name: `${metadata.title} (Persistent)`,
                    description: `Chat with ${metadata.title} models with localStorage persistence`,
                    llmTools,
                    metadata,
                    configFields,
                };
            }
        }

        return scenarios;
    }, [providerConfigs]);

    const handleChange = (messages: ReadonlyArray<ChatMessage>, participants: ReadonlyArray<ChatParticipant>) => {
        console.log('Chat state changed:', { messages: messages.length, participants: participants.length });
    };

    const handleScenarioChange = (newScenario: string) => {
        setScenario(newScenario);
    };

    const handleConfigChange = (providerId: string, field: string, value: string) => {
        const currentConfig = providerConfigs[providerId] || {};
        const newConfig = { ...currentConfig, [field]: value };
        saveProviderConfig(providerId, newConfig);
    };

    const renderConfigFields = (scenarioData: ScenarioDefinition) => {
        if (!scenarioData.metadata || !scenarioData.configFields) {
            return null;
        }

        const providerId = `${scenarioData.metadata.packageName}-${scenarioData.metadata.className}`;
        const config = providerConfigs[providerId] || {};

        return (
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Configuration for {scenarioData.metadata.title}:</h4>
                {scenarioData.configFields.map((field) => (
                    <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}:{field.required && <span className="text-red-500 ml-1">*</span>}
                            <span className="text-xs text-gray-500 ml-1">(stored in localStorage)</span>
                        </label>
                        <input
                            type={field.type}
                            value={config[field.key] || ''}
                            onChange={(e) => handleConfigChange(providerId, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                        {field.required && (!config[field.key] || !config[field.key].trim()) && (
                            <p className="text-xs text-red-600 mt-1">{field.label} is required</p>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderChat = () => {
        const currentScenario = scenarios[scenario];

        if (!currentScenario) {
            return <div className="text-red-600">Invalid scenario selected</div>;
        }

        if (!currentScenario.llmTools) {
            return (
                <div className="text-red-600 p-4 border border-red-300 rounded-md bg-red-50">
                    <p className="font-medium">Configuration Required</p>
                    <p className="text-sm mt-1">
                        Please configure the required settings above to use {currentScenario.name}.
                    </p>
                </div>
            );
        }

        const commonProps = {
            llmTools: currentScenario.llmTools,
            onChange: handleChange,
            style: { height: '600px' },
        };

        const isPersistent = scenario.includes('persistent');
        const persistenceKey = isPersistent ? `demo-${scenario.replace('-persistent', '')}-chat` : undefined;

        return (
            <LlmChat
                {...commonProps}
                persistenceKey={persistenceKey}
                placeholderMessageContent={
                    isPersistent
                        ? `This ${currentScenario.name} chat persists in localStorage - try refreshing the page!`
                        : `Ask ${currentScenario.name} anything...`
                }
            />
        );
    };

    const currentScenario = scenarios[scenario];
    const needsConfiguration =
        currentScenario?.metadata && currentScenario.configFields && currentScenario.configFields.length > 0;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">LLM Chat Scenario:</label>
                    <select
                        value={scenario}
                        onChange={(e) => handleScenarioChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                        {Object.entries(scenarios).map(([key, scenarioData]) => (
                            <option key={key} value={key}>
                                {scenarioData.name}
                            </option>
                        ))}
                    </select>
                </div>

                {needsConfiguration && (
                    <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                        {renderConfigFields(currentScenario)}
                    </div>
                )}
            </div>

            {renderChat()}

            <div className="text-sm text-gray-600 space-y-2">
                <p>
                    <strong>Current scenario:</strong> {currentScenario?.name || 'Unknown'}
                </p>
                <p>
                    <strong>Description:</strong> {currentScenario?.description || 'No description available'}
                </p>
                {currentScenario?.llmTools && (
                    <p>
                        <strong>LLM Provider:</strong> {currentScenario.llmTools.title} -{' '}
                        {currentScenario.llmTools.description}
                    </p>
                )}
                <div className="bg-blue-50 p-3 rounded-md">
                    <p className="font-medium text-blue-800">How it works:</p>
                    <ul className="text-blue-700 text-xs mt-1 space-y-1">
                        <li>• Type a message and press Enter or click Send</li>
                        <li>• The component manages messages and participants internally</li>
                        {scenario.startsWith('mock-') && (
                            <li>• Uses MockedEchoLlmExecutionTools which echoes back your input</li>
                        )}
                        {!scenario.startsWith('mock-') && currentScenario?.metadata && (
                            <li>• Uses {currentScenario.metadata.title} for intelligent responses</li>
                        )}
                        <li>• Shows loading states and task progress during LLM calls</li>
                        <li>• Automatically generates participants from LLM tools</li>
                        {scenario.includes('persistent') && (
                            <>
                                <li>
                                    • <strong>Persistence:</strong> Messages are saved to localStorage
                                </li>
                                <li>• Try refreshing the page - your conversation will be restored!</li>
                                <li>• Use the Reset button to clear both UI and localStorage</li>
                            </>
                        )}
                        {needsConfiguration && (
                            <li>
                                • <strong>Security:</strong> Configuration is stored locally in your browser
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
