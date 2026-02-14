'use client';

import { showConfirm } from '@/src/components/AsyncDialogs/asyncDialogs';
import { useEffect, useMemo, useState } from 'react';

/**
 * Agent option used by user-memory UI.
 */
export type UserMemoryAgentOption = {
    permanentId: string;
    agentName: string;
    label: string;
};

/**
 * User memory API record.
 */
type UserMemoryEntry = {
    id: number;
    createdAt: string;
    updatedAt: string;
    userId: number;
    agentPermanentId: string | null;
    content: string;
    isGlobal: boolean;
};

/**
 * Filter scope used by user-memory UI.
 */
type MemoryFilterScope = 'ALL' | 'GLOBAL' | string;

/**
 * Props for the user-memory client page.
 */
type UserMemoryClientProps = {
    agents: Array<UserMemoryAgentOption>;
};

/**
 * User memory CRUD UI under System menu.
 */
export function UserMemoryClient(props: UserMemoryClientProps) {
    const { agents } = props;
    const [memories, setMemories] = useState<UserMemoryEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState<string>('');
    const [filterScope, setFilterScope] = useState<MemoryFilterScope>('ALL');
    const [newContent, setNewContent] = useState<string>('');
    const [newIsGlobal, setNewIsGlobal] = useState<boolean>(false);
    const [newAgentPermanentId, setNewAgentPermanentId] = useState<string>(agents[0]?.permanentId || '');
    const [editingMemoryId, setEditingMemoryId] = useState<number | null>(null);
    const [editingContent, setEditingContent] = useState<string>('');
    const [editingIsGlobal, setEditingIsGlobal] = useState<boolean>(false);
    const [editingAgentPermanentId, setEditingAgentPermanentId] = useState<string>('');

    /**
     * Agent label lookups by permanent id.
     */
    const agentLabelByPermanentId = useMemo(() => {
        const entries = agents.map((agent) => [agent.permanentId, agent.label] as const);
        return new Map<string, string>(entries);
    }, [agents]);

    /**
     * Loads memories from API for selected scope and search query.
     */
    const loadMemories = async () => {
        setLoading(true);
        setError(null);

        try {
            const query = new URLSearchParams();
            if (search.trim()) {
                query.set('search', search.trim());
            }

            if (filterScope !== 'ALL' && filterScope !== 'GLOBAL') {
                query.set('agentPermanentId', filterScope);
                query.set('includeGlobal', 'true');
            }

            const response = await fetch(`/api/user-memory?${query.toString()}`);
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to load memories.');
            }

            const data = (await response.json()) as UserMemoryEntry[];
            const filteredData =
                filterScope === 'GLOBAL' ? data.filter((memory) => memory.isGlobal) : data;
            setMemories(filteredData);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMemories();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterScope]);

    /**
     * Submits a new memory entry.
     */
    const handleCreateMemory = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        if (!newContent.trim()) {
            setError('Memory content is required.');
            return;
        }

        if (!newIsGlobal && !newAgentPermanentId) {
            setError('Select an agent or switch to global memory.');
            return;
        }

        setSaving(true);
        try {
            const response = await fetch('/api/user-memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newContent,
                    isGlobal: newIsGlobal,
                    agentPermanentId: newIsGlobal ? null : newAgentPermanentId,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to create memory.');
            }

            setNewContent('');
            await loadMemories();
        } catch (createError) {
            setError(createError instanceof Error ? createError.message : 'Failed to create memory.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Starts editing for one memory row.
     */
    const startEditing = (memory: UserMemoryEntry) => {
        setEditingMemoryId(memory.id);
        setEditingContent(memory.content);
        setEditingIsGlobal(memory.isGlobal);
        setEditingAgentPermanentId(memory.agentPermanentId || agents[0]?.permanentId || '');
    };

    /**
     * Cancels active memory edit state.
     */
    const cancelEditing = () => {
        setEditingMemoryId(null);
        setEditingContent('');
        setEditingIsGlobal(false);
        setEditingAgentPermanentId('');
    };

    /**
     * Persists currently edited memory row.
     */
    const handleUpdateMemory = async () => {
        if (!editingMemoryId) {
            return;
        }

        if (!editingContent.trim()) {
            setError('Memory content is required.');
            return;
        }

        if (!editingIsGlobal && !editingAgentPermanentId) {
            setError('Select an agent or switch to global memory.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/user-memory/${editingMemoryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: editingContent,
                    isGlobal: editingIsGlobal,
                    agentPermanentId: editingIsGlobal ? null : editingAgentPermanentId,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to update memory.');
            }

            cancelEditing();
            await loadMemories();
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : 'Failed to update memory.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Deletes one memory after confirmation.
     */
    const handleDeleteMemory = async (memory: UserMemoryEntry) => {
        const confirmed = await showConfirm({
            title: 'Delete memory',
            message: 'Do you want to delete this memory?',
            confirmLabel: 'Delete memory',
            cancelLabel: 'Cancel',
        }).catch(() => false);

        if (!confirmed) {
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/user-memory/${memory.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to delete memory.');
            }

            if (editingMemoryId === memory.id) {
                cancelEditing();
            }

            await loadMemories();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete memory.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Returns scope label for one memory item.
     */
    const getScopeLabel = (memory: UserMemoryEntry): string => {
        if (memory.isGlobal) {
            return 'Global';
        }

        if (!memory.agentPermanentId) {
            return 'Unknown agent';
        }

        return agentLabelByPermanentId.get(memory.agentPermanentId) || memory.agentPermanentId;
    };

    return (
        <div className="container mx-auto p-8 max-w-5xl">
            <h1 className="text-3xl font-bold mb-8">User Memory</h1>

            {error && (
                <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="bg-white shadow rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Create Memory</h2>
                <form onSubmit={handleCreateMemory} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Memory text</label>
                        <textarea
                            value={newContent}
                            onChange={(event) => setNewContent(event.target.value)}
                            className="w-full min-h-[120px] rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Remember that the user is working on ..."
                        />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={newIsGlobal}
                                onChange={(event) => setNewIsGlobal(event.target.checked)}
                            />
                            Make this memory global
                        </label>

                        <select
                            value={newAgentPermanentId}
                            onChange={(event) => setNewAgentPermanentId(event.target.value)}
                            disabled={newIsGlobal}
                            className="w-full sm:w-80 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                            {agents.map((agent) => (
                                <option key={agent.permanentId} value={agent.permanentId}>
                                    {agent.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Store Memory'}
                    </button>
                </form>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Scope filter</label>
                        <select
                            value={filterScope}
                            onChange={(event) => setFilterScope(event.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">All memories</option>
                            <option value="GLOBAL">Global memories</option>
                            {agents.map((agent) => (
                                <option key={agent.permanentId} value={agent.permanentId}>
                                    {agent.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search memory text..."
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={loadMemories}
                                className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Scope
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Memory
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Updated
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                                    Loading memories...
                                </td>
                            </tr>
                        ) : memories.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                                    No memories found.
                                </td>
                            </tr>
                        ) : (
                            memories.map((memory) => {
                                const isEditing = editingMemoryId === memory.id;

                                return (
                                    <tr key={memory.id}>
                                        <td className="px-4 py-3 text-sm text-gray-600">{getScopeLabel(memory)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        value={editingContent}
                                                        onChange={(event) => setEditingContent(event.target.value)}
                                                        className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                        <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                                                            <input
                                                                type="checkbox"
                                                                checked={editingIsGlobal}
                                                                onChange={(event) =>
                                                                    setEditingIsGlobal(event.target.checked)
                                                                }
                                                            />
                                                            Global memory
                                                        </label>

                                                        <select
                                                            value={editingAgentPermanentId}
                                                            onChange={(event) =>
                                                                setEditingAgentPermanentId(event.target.value)
                                                            }
                                                            disabled={editingIsGlobal}
                                                            className="w-full sm:w-72 rounded-md border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                        >
                                                            {agents.map((agent) => (
                                                                <option key={agent.permanentId} value={agent.permanentId}>
                                                                    {agent.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="whitespace-pre-wrap">{memory.content}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {new Date(memory.updatedAt).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">
                                            {isEditing ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={handleUpdateMemory}
                                                        disabled={saving}
                                                        className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="rounded-md bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => startEditing(memory)}
                                                        className="rounded-md bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMemory(memory)}
                                                        className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

