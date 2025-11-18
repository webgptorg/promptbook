export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AgentsDatabaseSchema = {
    graphql_public: {
        Tables: {
            [_ in never]: never;
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            graphql: {
                Args: {
                    operationName?: string;
                    query?: string;
                    variables?: Json;
                    extensions?: Json;
                };
                Returns: Json;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
    public: {
        Tables: {
            AgentCollection: {
                Row: {
                    id: number;
                    agentName: string; // <- `string_agent_name`
                    agentProfile: Json; // <- `AgentBasicInformation` <- TODO: [🕛]
                    createdAt: string; // <- `string_date_iso8601`
                    updatedAt: string | null; // <- `string_date_iso8601`
                    agentVersion: number;
                    promptbookEngineVersion: string; // <- `string_promptbook_version`
                    usage: Json | null; // <- `Usage`
                    agentSource: string; // <- `string_book`
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
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
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
