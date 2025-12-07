/**
 * AUTO-GENERATED TYPES FROM `schema.sql`
 * Source of truth: `schema.sql` *(do not edit table structure here manually)*
 *
 * [💽] Prompt:
 * Re-generate supabase typescript schema from the `./schema.sql`
 */

// Json helper (Supabase style)
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Public schema database interface (Supabase convention)
export type AgentsServerDatabase = {
    // <- TODO: [🧠][🕜] Better naming
    public: {
        Tables: {
            Metadata: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    key: string;
                    value: string;
                    note: string | null;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    key: string;
                    value: string;
                    note?: string | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    key?: string;
                    value?: string;
                    note?: string | null;
                };
                Relationships: [];
            };
            Agent: {
                Row: {
                    id: number;
                    agentName: string;
                    createdAt: string;
                    updatedAt: string | null;
                    agentHash: string;
                    agentSource: string;
                    agentProfile: Json;
                    promptbookEngineVersion: string;
                    usage: Json | null;
                    preparedModelRequirements: Json | null;
                    preparedExternals: Json | null;
                };
                Insert: {
                    id?: number;
                    agentName: string;
                    createdAt: string;
                    updatedAt?: string | null;
                    agentHash: string;
                    agentSource: string;
                    agentProfile: Json;
                    promptbookEngineVersion: string;
                    usage?: Json | null;
                    preparedModelRequirements?: Json | null;
                    preparedExternals?: Json | null;
                };
                Update: {
                    id?: number;
                    agentName?: string;
                    createdAt?: string;
                    updatedAt?: string | null;
                    agentHash?: string;
                    agentSource?: string;
                    agentProfile?: Json;
                    promptbookEngineVersion?: string;
                    usage?: Json | null;
                    preparedModelRequirements?: Json | null;
                    preparedExternals?: Json | null;
                };
                Relationships: [];
            };
            AgentHistory: {
                Row: {
                    id: number;
                    createdAt: string;
                    agentName: string;
                    agentHash: string;
                    previousAgentHash: string | null;
                    agentSource: string;
                    promptbookEngineVersion: string;
                };
                Insert: {
                    id?: number;
                    createdAt: string;
                    agentName: string;
                    agentHash: string;
                    previousAgentHash?: string | null;
                    agentSource: string;
                    promptbookEngineVersion: string;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    agentName?: string;
                    agentHash?: string;
                    previousAgentHash?: string | null;
                    agentSource?: string;
                    promptbookEngineVersion?: string;
                };
                Relationships: [];
            };
            ChatHistory: {
                Row: {
                    id: number;
                    createdAt: string;
                    messageHash: string;
                    previousMessageHash: string | null;
                    agentName: string;
                    agentHash: string;
                    message: Json;
                    promptbookEngineVersion: string | null;
                    url: string | null;
                    ip: string | null;
                    userAgent: string | null;
                    language: string | null;
                    platform: string | null;
                    source: 'AGENT_PAGE_CHAT' | 'OPENAI_API_COMPATIBILITY' | null;
                    apiKey: string | null;
                };
                Insert: {
                    id?: number;
                    createdAt: string;
                    messageHash: string;
                    previousMessageHash?: string | null;
                    agentName: string;
                    agentHash: string;
                    message: Json;
                    promptbookEngineVersion?: string | null;
                    url?: string | null;
                    ip?: string | null;
                    userAgent?: string | null;
                    language?: string | null;
                    platform?: string | null;
                    source?: 'AGENT_PAGE_CHAT' | 'OPENAI_API_COMPATIBILITY' | null;
                    apiKey?: string | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    messageHash?: string;
                    previousMessageHash?: string | null;
                    agentName?: string;
                    agentHash?: string;
                    message?: Json;
                    promptbookEngineVersion?: string | null;
                    url?: string | null;
                    ip?: string | null;
                    userAgent?: string | null;
                    language?: string | null;
                    platform?: string | null;
                    source?: 'AGENT_PAGE_CHAT' | 'OPENAI_API_COMPATIBILITY' | null;
                    apiKey?: string | null;
                };
                Relationships: [];
            };
            ChatFeedback: {
                Row: {
                    id: number;
                    createdAt: string;
                    agentName: string;
                    agentHash: string;
                    rating: string | null;
                    textRating: string | null;
                    chatThread: string | null;
                    userNote: string | null;
                    expectedAnswer: string | null;
                    promptbookEngineVersion: string | null;
                    url: string | null;
                    ip: string | null;
                    userAgent: string | null;
                    language: string | null;
                    platform: string | null;
                };
                Insert: {
                    id?: number;
                    createdAt: string;
                    agentName: string;
                    agentHash: string;
                    rating?: string | null;
                    textRating?: string | null;
                    chatThread?: string | null;
                    userNote?: string | null;
                    expectedAnswer?: string | null;
                    promptbookEngineVersion?: string | null;
                    url?: string | null;
                    ip?: string | null;
                    userAgent?: string | null;
                    language?: string | null;
                    platform?: string | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    agentName?: string;
                    agentHash?: string;
                    rating?: string | null;
                    textRating?: string | null;
                    chatThread?: string | null;
                    userNote?: string | null;
                    expectedAnswer?: string | null;
                    promptbookEngineVersion?: string | null;
                    url?: string | null;
                    ip?: string | null;
                    userAgent?: string | null;
                    language?: string | null;
                    platform?: string | null;
                };
                Relationships: [];
            };
            User: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    username: string;
                    passwordHash: string;
                    isAdmin: boolean;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    username: string;
                    passwordHash: string;
                    isAdmin?: boolean;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    username?: string;
                    passwordHash?: string;
                    isAdmin?: boolean;
                };
                Relationships: [];
            };
            LlmCache: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    hash: string;
                    value: Json;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    hash: string;
                    value: Json;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    hash?: string;
                    value?: Json;
                };
                Relationships: [];
            };
            ApiTokens: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    token: string;
                    note: string | null;
                    isRevoked: boolean;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    token: string;
                    note?: string | null;
                    isRevoked?: boolean;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    token?: string;
                    note?: string | null;
                    isRevoked?: boolean;
                };
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
};
