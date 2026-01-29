/**
 * AUTO-GENERATED SUBSET TYPES FROM `/apps/agents-server/src/database/schema.ts`
 * Source of truth: `/apps/agents-server/src/database/schema.sql` *(do not edit table structure here manually)*
 *
 * [💽] Prompt:
 * Re-generate this sub-schema from `/apps/agents-server/src/database/schema.ts` *(which was generated from `/apps/agents-server/src/database/migrations/*.sql`)*
 * `AgentsDatabaseSchema` is strict subset of `AgentsServerDatabase`
 * Generate Supabase TypeScript schema which is a subset of `AgentsServerDatabase`
 * containing only tables `Agent` and `AgentHistory`
 *
 * NOTE: This file intentionally omits all other tables (`Metadata`, `ChatHistory`, `ChatFeedback`, `User`, `LlmCache`, etc.)
 *       and any extra schemas (e.g. `graphql_public`) to remain a strict subset.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AgentsDatabaseSchema = {
    // <- TODO: [🧠][🕜] Better naming
    public: {
        Tables: {
            Agent: {
                Row: {
                    id: number;
                    agentName: string; // <- `string_agent_name`
                    createdAt: string; // <- `string_date_iso8601`
                    updatedAt: string | null; // <- `string_date_iso8601`
                    permanentId: string | null;
                    agentHash: string; // <- `string_agent_hash`
                    agentSource: string; // <- `string_book`
                    agentProfile: Json; // <- `AgentBasicInformation` (serialized)
                    promptbookEngineVersion: string; // <- `string_promptbook_version`
                    usage: Json | null; // <- `Usage`
                    preparedModelRequirements: Json | null; // <- `ModelRequirements` (prepared)
                    preparedExternals: Json | null; // <- `PreparedExternals`
                    deletedAt: string | null;
                    visibility: 'PUBLIC' | 'PRIVATE';
                };
                Insert: {
                    id?: number;
                    agentName: string;
                    createdAt: string;
                    updatedAt?: string | null;
                    permanentId?: string | null;
                    agentHash: string;
                    agentSource: string;
                    agentProfile: Json;
                    promptbookEngineVersion: string;
                    usage?: Json | null;
                    preparedModelRequirements?: Json | null;
                    preparedExternals?: Json | null;
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
                    preparedExternals?: Json | null;
                    deletedAt?: string | null;
                    visibility?: 'PUBLIC' | 'PRIVATE';
                };
                Relationships: [];
            };
            AgentHistory: {
                Row: {
                    id: number;
                    createdAt: string; // <- `string_date_iso8601`
                    agentName: string; // <- `string_agent_name`
                    permanentId: string; // <- `string_agent_permanent_id`
                    agentHash: string; // <- `string_agent_hash`
                    previousAgentHash: string | null; // <- `string_agent_hash`
                    agentSource: string; // <- `string_book`
                    promptbookEngineVersion: string; // <- `string_promptbook_version`
                };
                Insert: {
                    id?: number;
                    createdAt: string;
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
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
};

type PublicSchema = AgentsDatabaseSchema[Extract<keyof AgentsDatabaseSchema, 'public'>];

export type Tables<
    PublicTableNameOrOptions extends
        | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
        | { schema: keyof AgentsDatabaseSchema },
    TableName extends PublicTableNameOrOptions extends { schema: keyof AgentsDatabaseSchema }
        ? keyof (AgentsDatabaseSchema[PublicTableNameOrOptions['schema']]['Tables'] &
              AgentsDatabaseSchema[PublicTableNameOrOptions['schema']]['Views'])
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof AgentsDatabaseSchema }
    ? (AgentsDatabaseSchema[PublicTableNameOrOptions['schema']]['Tables'] &
          AgentsDatabaseSchema[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
          Row: infer R;
      }
        ? R
        : never
    : never;

export type TablesInsert<
    PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof AgentsDatabaseSchema },
    TableName extends PublicTableNameOrOptions extends { schema: keyof AgentsDatabaseSchema }
        ? keyof AgentsDatabaseSchema[PublicTableNameOrOptions['schema']]['Tables']
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof AgentsDatabaseSchema }
    ? AgentsDatabaseSchema[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
          Insert: infer I;
      }
        ? I
        : never
    : never;

export type TablesUpdate<
    PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof AgentsDatabaseSchema },
    TableName extends PublicTableNameOrOptions extends { schema: keyof AgentsDatabaseSchema }
        ? keyof AgentsDatabaseSchema[PublicTableNameOrOptions['schema']]['Tables']
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof AgentsDatabaseSchema }
    ? AgentsDatabaseSchema[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
          Update: infer U;
      }
        ? U
        : never
    : never;

export type Enums<
    PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof AgentsDatabaseSchema },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof AgentsDatabaseSchema }
        ? keyof AgentsDatabaseSchema[PublicEnumNameOrOptions['schema']]['Enums']
        : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof AgentsDatabaseSchema }
    ? AgentsDatabaseSchema[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof PublicSchema['CompositeTypes']
        | { schema: keyof AgentsDatabaseSchema },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof AgentsDatabaseSchema;
    }
        ? keyof AgentsDatabaseSchema[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
        : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof AgentsDatabaseSchema }
    ? AgentsDatabaseSchema[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;
