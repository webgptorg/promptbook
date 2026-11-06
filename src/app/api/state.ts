import { createHash } from 'node:crypto';
import { PtbkError } from '../../common/errors.js';
import { readPrivateFile, writePrivateFile } from '../files.js';
import { newOpaqueId } from '../web/access.js';

/**
 * The engine API's own state in the App data directory (mode 0600): what the App adds around the project's Books.
 */
const STATE_FILE = 'engine-api.json';

/**
 * Bounds of the remembered authorship and request keys (oldest dropped first).
 */
const MAX_MESSAGE_AUTHORS = 20_000;
const MAX_SEND_KEYS = 2_000;

/**
 * Who may see an agent in the App.
 *
 * @private App engine API
 */
export type AgentVisibility = 'public' | 'private' | 'unlisted';

/**
 * A folder of agents in the engine UI.
 *
 * @private App engine API
 */
export type ApiFolder = { readonly id: string; name: string; readonly createdAt: string; updatedAt: string };

/**
 * A remembered `requestKey` of a sent message: the same key with the same content answers the same message.
 *
 * @private App engine API
 */
export type SentKey = { readonly chatId: string; readonly digest: string; readonly messageId: string; readonly at: string };

/**
 * The persisted state.
 */
type StateFile = {
    v: 1;
    folders: ApiFolder[];
    /** Agent ID → folder ID. */
    agentFolders: Record<string, string>;
    /** Agent ID → visibility chosen in the App. */
    agentVisibility: Record<string, AgentVisibility>;
    /** Agent ID → the member who created it through the App. */
    agentCreators: Record<string, string>;
    settings: { name?: string; defaultAgentVisibility?: AgentVisibility };
    /** Message ID (`<chat>#<position>`) → the member who sent that User message through the App. */
    messageAuthors: Record<string, string>;
    sendKeys: Record<string, SentKey>;
};

/**
 * A SHA-256 hex digest of text.
 *
 * @private App engine API
 */
export function textDigest(text: string): string {
    return createHash('sha256').update(text).digest('hex');
}

/**
 * The engine API's state beside the Books: folders, agent placement and visibility, App settings, which member sent
 * which User message, and the request keys of sends. Writes are serialized; a damaged file is refused by name.
 *
 * @private App engine API
 */
export class EngineApiState {
    private state: StateFile = { v: 1, folders: [], agentFolders: {}, agentVisibility: {}, agentCreators: {}, settings: {}, messageAuthors: {}, sendKeys: {} };
    private writes: Promise<void> = Promise.resolve();

    private constructor(private readonly directory: string) {}

    /** Loads (or starts) the state of an App data directory. */
    public static async open(directory: string): Promise<EngineApiState> {
        const store = new EngineApiState(directory);
        const text = await readPrivateFile(directory, STATE_FILE);
        if (text) {
            try {
                const parsed = JSON.parse(text) as Partial<StateFile>;
                if (parsed.v !== 1) throw new Error('unknown version');
                store.state = { ...store.state, ...parsed, v: 1 };
            } catch {
                throw new PtbkError(`The App engine API state ${directory}/${STATE_FILE} is damaged; move it away to start it again (folders and App settings are then forgotten).`, { kind: 'configuration' });
            }
        }
        return store;
    }

    /** Persists the state (serialized). */
    private persist(): Promise<void> {
        const text = `${JSON.stringify(this.state, null, 2)}\n`;
        this.writes = this.writes.then(() => writePrivateFile(this.directory, STATE_FILE, text)).catch(() => undefined);
        return this.writes;
    }

    /** Folders by name. */
    public folders(): readonly ApiFolder[] {
        return [...this.state.folders].sort((a, b) => a.name.localeCompare(b.name));
    }

    /** One folder. */
    public folder(id: string): ApiFolder | undefined {
        return this.state.folders.find((folder) => folder.id === id);
    }

    /** Whether a folder name is used (case-insensitive), except by `except`. */
    private nameTaken(name: string, except?: string): boolean {
        return this.state.folders.some((folder) => folder.id !== except && folder.name.toLowerCase() === name.toLowerCase());
    }

    /** Creates a folder, or `undefined` when the name is taken. */
    public async createFolder(name: string): Promise<ApiFolder | undefined> {
        if (this.nameTaken(name)) return undefined;
        const at = new Date().toISOString();
        const folder: ApiFolder = { id: newOpaqueId(), name, createdAt: at, updatedAt: at };
        this.state.folders.push(folder);
        await this.persist();
        return folder;
    }

    /** Renames a folder: the folder, `taken`, or `undefined` when it does not exist. */
    public async renameFolder(id: string, name: string): Promise<ApiFolder | 'taken' | undefined> {
        const folder = this.folder(id);
        if (!folder) return undefined;
        if (this.nameTaken(name, id)) return 'taken';
        folder.name = name;
        folder.updatedAt = new Date().toISOString();
        await this.persist();
        return folder;
    }

    /** Deletes an empty folder: `deleted`, `not-empty` or `missing`. */
    public async deleteFolder(id: string, liveAgents: ReadonlySet<string>): Promise<'deleted' | 'not-empty' | 'missing'> {
        if (!this.folder(id)) return 'missing';
        if (Object.entries(this.state.agentFolders).some(([agent, folder]) => folder === id && liveAgents.has(agent))) return 'not-empty';
        this.state.folders = this.state.folders.filter((folder) => folder.id !== id);
        for (const [agent, folder] of Object.entries(this.state.agentFolders)) if (folder === id) delete this.state.agentFolders[agent];
        await this.persist();
        return 'deleted';
    }

    /** An agent's folder. */
    public agentFolder(agentId: string): string | null {
        const folder = this.state.agentFolders[agentId];
        return folder && this.folder(folder) ? folder : null;
    }

    /** An agent's visibility (the App default for agents it never set). */
    public agentVisibility(agentId: string): AgentVisibility {
        return this.state.agentVisibility[agentId] ?? this.state.settings.defaultAgentVisibility ?? 'private';
    }

    /** The member who created an agent through the App. */
    public agentCreator(agentId: string): string | undefined {
        return this.state.agentCreators[agentId];
    }

    /** Records a new agent's placement, visibility and creator. */
    public async recordAgent(agentId: string, input: { readonly folderId?: string; readonly visibility?: AgentVisibility; readonly creator: string }): Promise<void> {
        if (input.folderId) this.state.agentFolders[agentId] = input.folderId;
        if (input.visibility) this.state.agentVisibility[agentId] = input.visibility;
        this.state.agentCreators[agentId] = input.creator;
        await this.persist();
    }

    /** Forgets a removed agent. */
    public async forgetAgent(agentId: string): Promise<void> {
        delete this.state.agentFolders[agentId];
        delete this.state.agentVisibility[agentId];
        delete this.state.agentCreators[agentId];
        await this.persist();
    }

    /** The App settings. */
    public get settings(): Readonly<StateFile['settings']> {
        return this.state.settings;
    }

    /** Updates the App settings. */
    public async updateSettings(patch: StateFile['settings']): Promise<void> {
        this.state.settings = { ...this.state.settings, ...patch };
        await this.persist();
    }

    /** The member who sent a User message through the App. */
    public messageAuthor(messageId: string): string | null {
        return this.state.messageAuthors[messageId] ?? null;
    }

    /** Records who sent a User message. */
    public async recordMessageAuthor(messageId: string, memberId: string): Promise<void> {
        this.state.messageAuthors[messageId] = memberId;
        const keys = Object.keys(this.state.messageAuthors);
        for (const key of keys.slice(0, Math.max(0, keys.length - MAX_MESSAGE_AUTHORS))) delete this.state.messageAuthors[key];
        await this.persist();
    }

    /** A remembered send of a request key. */
    public sentKey(requestKey: string): SentKey | undefined {
        return this.state.sendKeys[requestKey];
    }

    /** Remembers a send's request key. */
    public async recordSentKey(requestKey: string, sent: SentKey): Promise<void> {
        this.state.sendKeys[requestKey] = sent;
        const keys = Object.keys(this.state.sendKeys);
        for (const key of keys.slice(0, Math.max(0, keys.length - MAX_SEND_KEYS))) delete this.state.sendKeys[key];
        await this.persist();
    }
}
