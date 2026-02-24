/**
 * AUTO-GENERATED TYPES FROM `schema.sql`
 * Source of truth: `schema.sql` *(do not edit table structure here manually)*
 *
 * [💽] Prompt:
 * Re-generate supabase typescript schema from `./migrations/*.sql`
 */

/**
 * Json helper (Supabase style).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Public schema database interface (Supabase convention).
 */
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
                    permanentId: string | null;
                    agentHash: string;
                    agentSource: string;
                    agentProfile: Json;
                    promptbookEngineVersion: string;
                    usage: Json | null;
                    preparedModelRequirements: Json | null;
                    folderId: number | null;
                    sortOrder: number;
                    deletedAt: string | null;
                    visibility: 'PUBLIC' | 'PRIVATE';
                };
                Insert: {
                    id?: number;
                    agentName: string;
                    createdAt?: string;
                    updatedAt?: string | null;
                    permanentId?: string | null;
                    agentHash: string;
                    agentSource: string;
                    agentProfile: Json;
                    promptbookEngineVersion: string;
                    usage?: Json | null;
                    preparedModelRequirements?: Json | null;
                    folderId?: number | null;
                    sortOrder?: number;
                    deletedAt?: string | null;
                    visibility?: 'PUBLIC' | 'PRIVATE';
                };
                Update: {
                    id?: number;
                    agentName?: string;
                    createdAt?: string;
                    updatedAt?: string | null;
                    permanentId?: string | null;
                    agentHash?: string;
                    agentSource?: string;
                    agentProfile?: Json;
                    promptbookEngineVersion?: string;
                    usage?: Json | null;
                    preparedModelRequirements?: Json | null;
                    folderId?: number | null;
                    sortOrder?: number;
                    deletedAt?: string | null;
                    visibility?: 'PUBLIC' | 'PRIVATE';
                };
                Relationships: [
                    {
                        foreignKeyName: 'Agent_folderId_fkey';
                        columns: ['folderId'];
                        referencedRelation: 'AgentFolder';
                        referencedColumns: ['id'];
                    },
                ];
            };
            AgentExternals: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    type: string;
                    hash: string;
                    externalId: string;
                    vendor: string;
                    note: string | null;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    type: string;
                    hash: string;
                    externalId: string;
                    vendor: string;
                    note?: string | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    type?: string;
                    hash?: string;
                    externalId?: string;
                    vendor?: string;
                    note?: string | null;
                };
                Relationships: [];
            };
            VectorStoreKnowledgeSourceHashes: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    source: string;
                    hash: string;
                    etag: string | null;
                    lastModified: string | null;
                    sizeBytes: number | null;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    source: string;
                    hash: string;
                    etag?: string | null;
                    lastModified?: string | null;
                    sizeBytes?: number | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    source?: string;
                    hash?: string;
                    etag?: string | null;
                    lastModified?: string | null;
                    sizeBytes?: number | null;
                };
                Relationships: [];
            };
            AgentFolder: {
                Row: {
                    id: number;
                    name: string;
                    parentId: number | null;
                    createdAt: string;
                    updatedAt: string | null;
                    deletedAt: string | null;
                    sortOrder: number;
                    icon: string | null;
                    color: string | null;
                };
                Insert: {
                    id?: number;
                    name: string;
                    parentId?: number | null;
                    createdAt?: string;
                    updatedAt?: string | null;
                    deletedAt?: string | null;
                    sortOrder?: number;
                    icon?: string | null;
                    color?: string | null;
                };
                Update: {
                    id?: number;
                    name?: string;
                    parentId?: number | null;
                    createdAt?: string;
                    updatedAt?: string | null;
                    deletedAt?: string | null;
                    sortOrder?: number;
                    icon?: string | null;
                    color?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'AgentFolder_parentId_fkey';
                        columns: ['parentId'];
                        referencedRelation: 'AgentFolder';
                        referencedColumns: ['id'];
                    },
                ];
            };
            AgentHistory: {
                Row: {
                    id: number;
                    createdAt: string;
                    agentName: string;
                    permanentId: string;
                    agentHash: string;
                    previousAgentHash: string | null;
                    agentSource: string;
                    promptbookEngineVersion: string;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    agentName: string;
                    permanentId: string;
                    agentHash: string;
                    previousAgentHash?: string | null;
                    agentSource: string;
                    promptbookEngineVersion: string;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    agentName?: string;
                    permanentId?: string;
                    agentHash?: string;
                    previousAgentHash?: string | null;
                    agentSource?: string;
                    promptbookEngineVersion?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'AgentHistory_permanentId_fkey';
                        columns: ['permanentId'];
                        referencedRelation: 'Agent';
                        referencedColumns: ['permanentId'];
                    },
                ];
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
                    actorType: 'ANONYMOUS' | 'TEAM_MEMBER' | 'API_KEY' | null;
                    usage: Json | null;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
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
                    actorType?: 'ANONYMOUS' | 'TEAM_MEMBER' | 'API_KEY' | null;
                    usage?: Json | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    messageHash?: string | null;
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
                    actorType?: 'ANONYMOUS' | 'TEAM_MEMBER' | 'API_KEY' | null;
                    usage?: Json | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'ChatHistory_agentName_fkey';
                        columns: ['agentName'];
                        referencedRelation: 'Agent';
                        referencedColumns: ['agentName'];
                    },
                ];
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
                    createdAt?: string;
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
                Relationships: [
                    {
                        foreignKeyName: 'ChatFeedback_agentName_fkey';
                        columns: ['agentName'];
                        referencedRelation: 'Agent';
                        referencedColumns: ['agentName'];
                    },
                ];
            };
            User: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    username: string;
                    passwordHash: string;
                    isAdmin: boolean;
                    profileImageUrl: string | null;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    username: string;
                    passwordHash: string;
                    isAdmin?: boolean;
                    profileImageUrl?: string | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    username?: string;
                    passwordHash?: string;
                    isAdmin?: boolean;
                    profileImageUrl?: string | null;
                };
                Relationships: [];
            };
            UserChat: {
                Row: {
                    id: string;
                    createdAt: string;
                    updatedAt: string;
                    lastMessageAt: string | null;
                    userId: number;
                    agentPermanentId: string;
                    messages: Json;
                };
                Insert: {
                    id: string;
                    createdAt?: string;
                    updatedAt?: string;
                    lastMessageAt?: string | null;
                    userId: number;
                    agentPermanentId: string;
                    messages?: Json;
                };
                Update: {
                    id?: string;
                    createdAt?: string;
                    updatedAt?: string;
                    lastMessageAt?: string | null;
                    userId?: number;
                    agentPermanentId?: string;
                    messages?: Json;
                };
                Relationships: [
                    {
                        foreignKeyName: 'UserChat_userId_fkey';
                        columns: ['userId'];
                        referencedRelation: 'User';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'UserChat_agentPermanentId_fkey';
                        columns: ['agentPermanentId'];
                        referencedRelation: 'Agent';
                        referencedColumns: ['permanentId'];
                    },
                ];
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
            OpenAiAssistantCache: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    agentHash: string;
                    assistantId: string;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    agentHash: string;
                    assistantId: string;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    agentHash?: string;
                    assistantId?: string;
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
            GenerationLock: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    lockKey: string;
                    expiresAt: string;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    lockKey: string;
                    expiresAt: string;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    lockKey?: string;
                    expiresAt?: string;
                };
                Relationships: [];
            };
            Image: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    filename: string;
                    prompt: string;
                    cdnUrl: string;
                    cdnKey: string;
                    agentId: number | null;
                    purpose: 'AVATAR' | 'TESTING' | null;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    filename: string;
                    prompt: string;
                    cdnUrl: string;
                    cdnKey: string;
                    agentId?: number | null;
                    purpose?: 'AVATAR' | 'TESTING' | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    filename?: string;
                    prompt?: string;
                    cdnUrl?: string;
                    cdnKey?: string;
                    agentId?: number | null;
                    purpose?: 'AVATAR' | 'TESTING' | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'Image_agentId_fkey';
                        columns: ['agentId'];
                        referencedRelation: 'Agent';
                        referencedColumns: ['id'];
                    },
                ];
            };
            File: {
                Row: {
                    id: number;
                    createdAt: string;
                    userId: number | null;
                    fileName: string;
                    fileSize: number;
                    fileType: string;
                    storageUrl: string | null;
                    shortUrl: string | null;
                    purpose: string;
                    status: string;
                    agentId: number | null;
                    securityResult: Json | null;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    userId?: number | null;
                    fileName: string;
                    fileSize: number;
                    fileType: string;
                    storageUrl?: string | null;
                    shortUrl?: string | null;
                    purpose: string;
                    status?: string;
                    agentId?: number | null;
                    securityResult?: Json | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    userId?: number | null;
                    fileName?: string;
                    fileSize?: number;
                    fileType?: string;
                    storageUrl?: string | null;
                    shortUrl?: string | null;
                    purpose?: string;
                    status?: string;
                    agentId?: number | null;
                    securityResult?: Json | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'File_userId_fkey';
                        columns: ['userId'];
                        referencedRelation: 'User';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'File_agentId_fkey';
                        columns: ['agentId'];
                        referencedRelation: 'Agent';
                        referencedColumns: ['id'];
                    },
                ];
            };
            Message: {
                Row: {
                    id: number;
                    createdAt: string;
                    channel: string;
                    direction: string;
                    sender: Json;
                    recipients: Json | null;
                    content: string;
                    threadId: string | null;
                    metadata: Json | null;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    channel: string;
                    direction: string;
                    sender: Json;
                    recipients?: Json | null;
                    content: string;
                    threadId?: string | null;
                    metadata?: Json | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    channel?: string;
                    direction?: string;
                    sender?: Json;
                    recipients?: Json | null;
                    content?: string;
                    threadId?: string | null;
                    metadata?: Json | null;
                };
                Relationships: [];
            };
            MessageSendAttempt: {
                Row: {
                    id: number;
                    createdAt: string;
                    messageId: number;
                    providerName: string;
                    isSuccessful: boolean;
                    raw: Json | null;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    messageId: number;
                    providerName: string;
                    isSuccessful: boolean;
                    raw?: Json | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    messageId?: number;
                    providerName?: string;
                    isSuccessful?: boolean;
                    raw?: Json | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'MessageSendAttempt_messageId_fkey';
                        columns: ['messageId'];
                        referencedRelation: 'Message';
                        referencedColumns: ['id'];
                    },
                ];
            };
            UserMemory: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    userId: number;
                    agentPermanentId: string | null;
                    content: string;
                    isGlobal: boolean;
                    deletedAt: string | null;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    userId: number;
                    agentPermanentId?: string | null;
                    content: string;
                    isGlobal?: boolean;
                    deletedAt?: string | null;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    userId?: number;
                    agentPermanentId?: string | null;
                    content?: string;
                    isGlobal?: boolean;
                    deletedAt?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'UserMemory_userId_fkey';
                        columns: ['userId'];
                        referencedRelation: 'User';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'UserMemory_agentPermanentId_fkey';
                        columns: ['agentPermanentId'];
                        referencedRelation: 'Agent';
                        referencedColumns: ['permanentId'];
                    },
                ];
            };
            UserData: {
                Row: {
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    userId: number;
                    key: string;
                    value: Json;
                };
                Insert: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    userId: number;
                    key: string;
                    value: Json;
                };
                Update: {
                    id?: number;
                    createdAt?: string;
                    updatedAt?: string;
                    userId?: number;
                    key?: string;
                    value?: Json;
                };
                Relationships: [
                    {
                        foreignKeyName: 'UserData_userId_fkey';
                        columns: ['userId'];
                        referencedRelation: 'User';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
};
