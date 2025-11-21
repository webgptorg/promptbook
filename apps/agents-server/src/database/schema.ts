/**
 * AUTO-GENERATED TYPES FROM `schema.sql`
 * [💽] Source of truth: `schema.sql` *(do not edit table structure here manually)*
 * 
 * Prompt:
 * [💽] Generate supabase typescript schema from the `schema.sql`
 */

// Json helper (Supabase style)
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Public schema database interface (Supabase convention)
export type AgentsServerDatabase = {
    public: {
        Tables: {
            Agent: {
                Row: {
                    id: number;
                    agentName: string;
                    createdAt: string;
                    updatedAt: string | null;
                    agentVersion: number;
                    promptbookEngineVersion: string;
                    usage: Json | null;
                    agentSource: string;
                    agentProfile: Json;
                };
                Insert: {
                    id?: number;
                    agentName: string;
                    createdAt: string;
                    updatedAt?: string | null;
                    agentVersion: number;
                    promptbookEngineVersion: string;
                    usage?: Json | null;
                    agentSource: string;
                    agentProfile: Json;
                };
                Update: {
                    id?: number;
                    agentName?: string;
                    createdAt?: string;
                    updatedAt?: string | null;
                    agentVersion?: number;
                    promptbookEngineVersion?: string;
                    usage?: Json | null;
                    agentSource?: string;
                    agentProfile?: Json;
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

// Convenient table-specific aliases
export type AgentRow = Database['public']['Tables']['Agent']['Row'];
export type AgentInsert = Database['public']['Tables']['Agent']['Insert'];
export type AgentUpdate = Database['public']['Tables']['Agent']['Update'];
