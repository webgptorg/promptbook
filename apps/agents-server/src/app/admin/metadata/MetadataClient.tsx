'use client';

import { FileText, Hash, Image, Shield, ToggleLeft, Type, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
            case 'IMAGE_URL':
                return <Image className="w-4 h-4" />;
            case 'IP_RANGE':
                return <Shield className="w-4 h-4" />;
            default:
                return <Type className="w-4 h-4" />;
        }
    };

    const validateIpOrCidr = (ip: string) => {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const cidrV4Regex =
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:3[0-2]|[12]?[0-9])$/;
        // Simple IPv6 check (allows :: abbreviation)
        const ipv6Regex =
            /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        const cidrV6Regex = /^([0-9a-fA-F:.]{2,})\/(12[0-8]|1[0-1][0-9]|[1-9][0-9]|[0-9])$/;

        if (ip.includes('/')) {
            return cidrV4Regex.test(ip) || cidrV6Regex.test(ip);
        }
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);

            // First, request a signed upload URL
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    fileSize: file.size,
                    purpose: formState.key || 'METADATA_IMAGE',
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to get upload URL: ${response.statusText}`);
            }

            const { uploadUrl, fileUrl } = await response.json();

            // Upload directly to Vercel Blob
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
            }

            const LONG_URL = `${process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!}/${process.env
                .NEXT_PUBLIC_CDN_PATH_PREFIX!}/user/files/`;
            const SHORT_URL = `https://ptbk.io/k/`;
            // <- TODO: [🌍] Unite this logic in one place

            const shortFileUrl = fileUrl.split(LONG_URL).join(SHORT_URL);
            setFormState((prev) => ({ ...prev, value: shortFileUrl }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload image');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
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
                        ) : formState.type === 'IMAGE_URL' ? (
                            <div className="space-y-2">
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        id="value"
                                        value={formState.value}
                                        onChange={(e) => setFormState({ ...formState, value: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Image URL..."
                                    />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-200 flex items-center space-x-2 min-w-max"
                                    >
                                        <Upload className="w-4 h-4" />
                                        <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                                    </button>
                                </div>
                                {formState.value && (
                                    <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50 inline-block">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={formState.value}
                                            alt="Preview"
                                            className="max-w-full h-auto max-h-[200px] object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
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
                        ) : formState.type === 'IP_RANGE' ? (
                            <div className="space-y-2">
                                <textarea
                                    id="value"
                                    value={formState.value.split(',').join('\n')}
                                    onChange={(e) => {
                                        const newValue = e.target.value
                                            .split('\n')
                                            .map((line) => line.trim())
                                            .filter((line) => line !== '')
                                            .join(',');
                                        setFormState({ ...formState, value: newValue });
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] font-mono"
                                    placeholder="e.g. 192.168.1.1&#10;10.0.0.0/24"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {formState.value
                                        .split(',')
                                        .filter((ip) => ip.trim() !== '')
                                        .map((ip, i) => {
                                            const isValid = validateIpOrCidr(ip.trim());
                                            return (
                                                <span
                                                    key={i}
                                                    className={`px-2 py-1 rounded text-xs font-mono border ${
                                                        isValid
                                                            ? 'bg-green-100 text-green-800 border-green-200'
                                                            : 'bg-red-100 text-red-800 border-red-200'
                                                    }`}
                                                >
                                                    {ip}
                                                    {!isValid && ' (Invalid)'}
                                                </span>
                                            );
                                        })}
                                </div>
                                <p className="text-xs text-gray-500">Enter each IP or CIDR range on a new line.</p>
                            </div>
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
