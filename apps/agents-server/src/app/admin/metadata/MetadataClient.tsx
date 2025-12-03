'use client';

import { FileText, Hash, ToggleLeft, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { metadataDefaults, MetadataType } from '../../../database/metadataDefaults';

type MetadataEntry = {
    id: number;
    key: string;
    value: string;
    note: string | null;
    createdAt: string;
    updatedAt: string;
    isDefault?: boolean;
    type?: MetadataType;
};

function mergeMetadataWithDefaults(data: MetadataEntry[]): MetadataEntry[] {
    const byKey = new Map<string, MetadataEntry>();

    // First prefer existing (non-default) metadata coming from the database
    for (const entry of data) {
        const existing = byKey.get(entry.key);
        if (!existing || existing.isDefault) {
            // Find type from defaults
            const def = metadataDefaults.find((d) => d.key === entry.key);
            byKey.set(entry.key, { ...entry, type: def?.type });
        }
    }

    // Then add defaults only for keys that are missing
    for (const def of metadataDefaults) {
        if (!byKey.has(def.key)) {
            byKey.set(def.key, {
                id: -1,
                key: def.key,
                value: def.value,
                note: def.note,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isDefault: true,
                type: def.type,
            });
        }
    }

    return Array.from(byKey.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function MetadataClient() {
    const [metadata, setMetadata] = useState<MetadataEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formState, setFormState] = useState<{
        key: string;
        value: string;
        note: string;
        type?: MetadataType;
    }>({ key: '', value: '', note: '' });

    const fetchMetadata = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/metadata');
            if (!response.ok) {
                throw new Error('Failed to fetch metadata');
            }
            const data: MetadataEntry[] = await response.json();

            const mergedData = mergeMetadataWithDefaults(data);

            setMetadata(mergedData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            // If editingId is -1 (default value) or null (new value), use POST to create
            // If editingId is > 0 (existing value), use PUT to update
            const method = editingId && editingId !== -1 ? 'PUT' : 'POST';
            const response = await fetch('/api/metadata', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formState),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save metadata');
            }

            setFormState({ key: '', value: '', note: '' });
            setEditingId(null);
            fetchMetadata();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleEdit = (entry: MetadataEntry) => {
        setEditingId(entry.id);
        setFormState({
            key: entry.key,
            value: entry.value,
            note: entry.note || '',
            type: entry.type,
        });
    };

    const handleDelete = async (key: string) => {
        if (!confirm('Are you sure you want to delete this metadata?')) return;

        try {
            const response = await fetch(`/api/metadata?key=${encodeURIComponent(key)}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete metadata');
            }

            fetchMetadata();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormState({ key: '', value: '', note: '' });
    };

    const getTypeIcon = (type?: MetadataType) => {
        switch (type) {
            case 'TEXT_SINGLE_LINE':
                return <Type className="w-4 h-4" />;
            case 'TEXT':
                return <FileText className="w-4 h-4" />;
            case 'NUMBER':
                return <Hash className="w-4 h-4" />;
            case 'BOOLEAN':
                return <ToggleLeft className="w-4 h-4" />;
            default:
                return <Type className="w-4 h-4" />;
        }
    };

    if (loading && metadata.length === 0) {
        return <div className="p-8 text-center">Loading metadata...</div>;
    }

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Metadata Management</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>
            )}

            <div className="bg-white shadow rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Metadata' : 'Add New Metadata'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-1">
                            Key
                        </label>
                        <input
                            type="text"
                            id="key"
                            value={formState.key}
                            onChange={(e) => setFormState({ ...formState, key: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={!!editingId} // Key cannot be changed during edit
                            placeholder="e.g., SERVER_NAME"
                        />
                        {editingId && <p className="text-xs text-gray-500 mt-1">Key cannot be changed.</p>}
                    </div>
                    <div>
                        <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
                            Value
                        </label>
                        {formState.type === 'TEXT_SINGLE_LINE' ? (
                            <input
                                type="text"
                                id="value"
                                value={formState.value}
                                onChange={(e) => setFormState({ ...formState, value: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                placeholder="Metadata value..."
                            />
                        ) : formState.type === 'BOOLEAN' ? (
                            <select
                                id="value"
                                value={formState.value}
                                onChange={(e) => setFormState({ ...formState, value: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="true">True</option>
                                <option value="false">False</option>
                            </select>
                        ) : formState.type === 'NUMBER' ? (
                            <input
                                type="number"
                                id="value"
                                value={formState.value}
                                onChange={(e) => setFormState({ ...formState, value: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                placeholder="Metadata value..."
                            />
                        ) : (
                            <textarea
                                id="value"
                                value={formState.value}
                                onChange={(e) => setFormState({ ...formState, value: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                                required
                                placeholder="Metadata value..."
                            />
                        )}
                    </div>
                    <div>
                        <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                            Note (Optional)
                        </label>
                        <input
                            type="text"
                            id="note"
                            value={formState.note}
                            onChange={(e) => setFormState({ ...formState, note: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Description of this metadata"
                        />
                    </div>
                    <div className="flex space-x-3">
                        <button
                            type="submit"
                            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            {editingId ? 'Update Metadata' : 'Add Metadata'}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Key
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Value
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Note
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {metadata.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                    No metadata found.
                                </td>
                            </tr>
                        ) : (
                            metadata.map((entry) => (
                                <tr key={entry.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        <div className="flex items-center" title={entry.type || 'Unknown'}>
                                            {getTypeIcon(entry.type)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {entry.key}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{entry.value}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{entry.note || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(entry)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            Edit
                                        </button>
                                        {!entry.isDefault && (
                                            <button
                                                onClick={() => handleDelete(entry.key)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        )}
                                        {entry.isDefault && (
                                            <span className="text-gray-400 text-xs italic ml-2">Default</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
