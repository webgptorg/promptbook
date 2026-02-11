'use client';

import { upload } from '@vercel/blob/client';
import { FileTextIcon, HashIcon, ImageIcon, ShieldIcon, ToggleLeftIcon, TypeIcon, Upload } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { showConfirm } from '../../../components/AsyncDialogs/asyncDialogs';
import { metadataDefaults, MetadataType } from '../../../database/metadataDefaults';
import { getSafeCdnPath } from '../../../utils/cdn/utils/getSafeCdnPath';
import { normalizeUploadFilename } from '../../../utils/normalization/normalizeUploadFilename';

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

/**
 * Normalizes metadata keys so they are safe to use as HTML id suffixes.
 *
 * @private
 */
const toHtmlIdSuffix = (value: string): string => value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');

/**
 * Tracks the form inputs shared between creating and editing metadata entries.
 *
 * @private
 */
type MetadataFormState = {
    key: string;
    value: string;
    note: string;
    type?: MetadataType;
};

/**
 * Builds a fresh metadata form state.
 *
 * @private
 */
const createEmptyFormState = (): MetadataFormState => ({
    key: '',
    value: '',
    note: '',
});

/**
 * Merges stored metadata values with the default keys so the admin UI always shows every supported entry.
 *
 * @private
 */
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

/**
 * Renders the metadata management admin view with creation and inline editing helpers.
 *
 * @private @@@
 */
export function MetadataClient() {
    const [metadata, setMetadata] = useState<MetadataEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [isAddUploading, setIsAddUploading] = useState(false);
    const [isEditUploading, setIsEditUploading] = useState(false);
    const addFileInputRef = useRef<HTMLInputElement | null>(null);
    const editFileInputRef = useRef<HTMLInputElement | null>(null);
    const [addFormState, setAddFormState] = useState<MetadataFormState>(createEmptyFormState);
    const [editingFormState, setEditingFormState] = useState<MetadataFormState>(createEmptyFormState);

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

    /**
     * Persists metadata changes by calling the admin metadata API.
     *
     * @private
     */
    const saveMetadata = async (method: 'POST' | 'PUT', payload: MetadataFormState) => {
        const response = await fetch('/api/metadata', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save metadata');
        }
    };

    const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        try {
            await saveMetadata('POST', addFormState);
            setAddFormState(createEmptyFormState());
            fetchMetadata();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (editingKey === null) return;
        setError(null);

        try {
            const isPersistedEntry = metadata.some((entry) => entry.key === editingKey && !entry.isDefault);
            const method = isPersistedEntry ? 'PUT' : 'POST';
            await saveMetadata(method, editingFormState);
            handleCancel();
            fetchMetadata();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleEdit = (entry: MetadataEntry) => {
        setEditingKey(entry.key);
        setEditingFormState({
            key: entry.key,
            value: entry.value,
            note: entry.note || '',
            type: entry.type,
        });
    };

    const handleDelete = async (key: string) => {
        const confirmed = await showConfirm({
            title: 'Delete metadata',
            message: 'Are you sure you want to delete this metadata?',
            confirmLabel: 'Delete metadata',
            cancelLabel: 'Cancel',
        }).catch(() => false);
        if (!confirmed) return;

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
        setEditingKey(null);
        setEditingFormState(createEmptyFormState());
    };

    const getTypeIcon = (type?: MetadataType) => {
        switch (type) {
            case 'TEXT_SINGLE_LINE':
                return <TypeIcon className="w-4 h-4" />;
            case 'TEXT':
                return <FileTextIcon className="w-4 h-4" />;
            case 'NUMBER':
                return <HashIcon className="w-4 h-4" />;
            case 'BOOLEAN':
                return <ToggleLeftIcon className="w-4 h-4" />;
            case 'IMAGE_URL':
                return <ImageIcon className="w-4 h-4" />;
            case 'IP_RANGE':
                return <ShieldIcon className="w-4 h-4" />;
            default:
                return <TypeIcon className="w-4 h-4" />;
        }
    };

    /**
     * Validates whether the provided string is an IPv4, IPv6, or CIDR range.
     *
     * @private
     */
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

    /**
     * Parameters required to upload an image and store the resulting URL in a metadata form.
     *
     * @private
     */
    type FileUploadParams = {
        event: React.ChangeEvent<HTMLInputElement>;
        formState: MetadataFormState;
        setFormState: React.Dispatch<React.SetStateAction<MetadataFormState>>;
        setUploading: React.Dispatch<React.SetStateAction<boolean>>;
        fileInputRef: React.RefObject<HTMLInputElement | null>;
    };

    /**
     * Uploads an image to the CDN and stores the shortened URL in the provided metadata form state.
     *
     * @private
     */
    const handleFileUpload = async ({
        event,
        formState,
        setFormState,
        setUploading,
        fileInputRef,
    }: FileUploadParams) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            const pathPrefix = process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '';
            const normalizedFilename = normalizeUploadFilename(file.name);
            const uploadPath = pathPrefix
                ? `${pathPrefix}/user/files/${normalizedFilename}`
                : `user/files/${normalizedFilename}`;
            const safeUploadPath = getSafeCdnPath({ pathname: uploadPath });

            const blob = await upload(safeUploadPath, file, {
                access: 'public',
                handleUploadUrl: '/api/upload',
                clientPayload: JSON.stringify({
                    purpose: formState.key || 'METADATA_IMAGE',
                    contentType: file.type,
                }),
            });

            const fileUrl = blob.url;

            const LONG_URL = `${process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!}/${process.env
                .NEXT_PUBLIC_CDN_PATH_PREFIX!}/user/files/`;
            const SHORT_URL = `https://ptbk.io/k/`;
            // <- TODO: [🌍] Unite this logic in one place

            const shortFileUrl = fileUrl.split(LONG_URL).join(SHORT_URL);
            setFormState((prev) => ({ ...prev, value: shortFileUrl }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload image');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleAddFileUpload = (event: React.ChangeEvent<HTMLInputElement>) =>
        handleFileUpload({
            event,
            formState: addFormState,
            setFormState: setAddFormState,
            setUploading: setIsAddUploading,
            fileInputRef: addFileInputRef,
        });

    const handleEditFileUpload = (event: React.ChangeEvent<HTMLInputElement>) =>
        handleFileUpload({
            event,
            formState: editingFormState,
            setFormState: setEditingFormState,
            setUploading: setIsEditUploading,
            fileInputRef: editFileInputRef,
        });

    /**
     * Props required to render the metadata value input across both forms.
     *
     * @private
     */
    type MetadataValueFieldProps = {
        type?: MetadataType;
        value: string;
        onValueChange: (value: string) => void;
        isUploading: boolean;
        fileInputRef: React.RefObject<HTMLInputElement | null>;
        onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void> | void;
        fieldId: string;
    };

    /**
     * Renders the correct value input control depending on the metadata type.
     *
     * @private
     */
    const MetadataValueField = ({
        type,
        value,
        onValueChange,
        isUploading,
        fileInputRef,
        onFileUpload,
        fieldId,
    }: MetadataValueFieldProps) => {
        if (type === 'TEXT_SINGLE_LINE') {
            return (
                <input
                    type="text"
                    id={fieldId}
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Metadata value..."
                />
            );
        }

        if (type === 'IMAGE_URL') {
            return (
                <div className="space-y-2">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            id={fieldId}
                            value={value}
                            onChange={(e) => onValueChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Image URL..."
                        />
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={onFileUpload}
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
                    {value && (
                        <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50 inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={value}
                                alt="Preview"
                                className="max-w-full h-auto max-h-[200px] object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                </div>
            );
        }

        if (type === 'BOOLEAN') {
            return (
                <select
                    id={fieldId}
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="true">True</option>
                    <option value="false">False</option>
                </select>
            );
        }

        if (type === 'NUMBER') {
            return (
                <input
                    type="number"
                    id={fieldId}
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Metadata value..."
                />
            );
        }

        if (type === 'IP_RANGE') {
            const tokens = value
                .split(',')
                .map((ip) => ip.trim())
                .filter((ip) => ip !== '');

            return (
                <div className="space-y-2">
                    <textarea
                        id={fieldId}
                        value={value.split(',').join('\n')}
                        onChange={(e) => {
                            const newValue = e.target.value
                                .split(/\r?\n/)
                                .map((line) => line.trim())
                                .filter((line) => line !== '')
                                .join(',');
                            onValueChange(newValue);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] font-mono"
                        placeholder="e.g. 192.168.1.1&#10;10.0.0.0/24"
                    />
                    <div className="flex flex-wrap gap-2">
                        {tokens.map((ip, i) => {
                            const isValid = validateIpOrCidr(ip);
                            return (
                                <span
                                    key={`${ip}-${i}`}
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
            );
        }

        return (
            <textarea
                id={fieldId}
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                required
                placeholder="Metadata value..."
            />
        );
    };

    if (loading && metadata.length === 0) {
        return <div className="p-8 text-center">Loading metadata...</div>;
    }

    return (
        <div className="w-full px-2 sm:px-4 md:px-8 py-8 max-w-screen-lg mx-auto">
            <h1 className="text-3xl font-bold mb-8">Metadata Management</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>
            )}

            <div className="bg-white shadow rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Add New Metadata</h2>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-1">
                            Key
                        </label>
                        <input
                            type="text"
                            id="key"
                            value={addFormState.key}
                            onChange={(e) => setAddFormState((prev) => ({ ...prev, key: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            placeholder="e.g., SERVER_NAME"
                        />
                    </div>
                    <div>
                        <label htmlFor="add-metadata-value" className="block text-sm font-medium text-gray-700 mb-1">
                            Value
                        </label>
                        <MetadataValueField
                            fieldId="add-metadata-value"
                            type={addFormState.type}
                            value={addFormState.value}
                            onValueChange={(value) => setAddFormState((prev) => ({ ...prev, value }))}
                            isUploading={isAddUploading}
                            fileInputRef={addFileInputRef}
                            onFileUpload={handleAddFileUpload}
                        />
                    </div>
                    <div>
                        <label htmlFor="add-metadata-note" className="block text-sm font-medium text-gray-700 mb-1">
                            Note (Optional)
                        </label>
                        <input
                            type="text"
                            id="add-metadata-note"
                            value={addFormState.note}
                            onChange={(e) => setAddFormState((prev) => ({ ...prev, note: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Description of this metadata"
                        />
                    </div>
                    <div className="flex space-x-3">
                        <button
                            type="submit"
                            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Add Metadata
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white shadow rounded-lg overflow-x-auto">
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
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                    No metadata found.
                                </td>
                            </tr>
                        ) : (
                            metadata.map((entry) => {
                                const htmlIdSuffix = toHtmlIdSuffix(entry.key);
                                const editValueFieldId = `edit-metadata-value-${htmlIdSuffix}`;
                                const editNoteFieldId = `edit-metadata-note-${htmlIdSuffix}`;

                                return (
                                    <Fragment key={`${entry.key}-${entry.id}`}>
                                        <tr>
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-500 text-sm sm:px-6 sm:py-4">
                                                <div className="flex items-center" title={entry.type || 'Unknown'}>
                                                    {getTypeIcon(entry.type)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-normal break-all text-sm font-medium text-gray-900 sm:px-6 sm:py-4">
                                                {entry.key}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500 max-w-xs break-all whitespace-normal sm:px-6 sm:py-4">
                                                {entry.value}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500 break-all whitespace-normal sm:px-6 sm:py-4">
                                                {entry.note || '-'}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium sm:px-6 sm:py-4">
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
                                        {editingKey === entry.key && (
                                            <tr>
                                                <td colSpan={5} className="bg-gray-50 px-6 py-4">
                                                    <form onSubmit={handleEditSubmit} className="space-y-4">
                                                        <div className="space-y-4">
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-900">
                                                                    Editing {entry.key}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    Key cannot be changed.
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <label
                                                                    htmlFor={editValueFieldId}
                                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                                >
                                                                    Value
                                                                </label>
                                                                <MetadataValueField
                                                                    fieldId={editValueFieldId}
                                                                    type={editingFormState.type}
                                                                    value={editingFormState.value}
                                                                    onValueChange={(value) =>
                                                                        setEditingFormState((prev) => ({ ...prev, value }))
                                                                    }
                                                                    isUploading={isEditUploading}
                                                                    fileInputRef={editFileInputRef}
                                                                    onFileUpload={handleEditFileUpload}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label
                                                                    htmlFor={editNoteFieldId}
                                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                                >
                                                                    Note (Optional)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    id={editNoteFieldId}
                                                                    value={editingFormState.note}
                                                                    onChange={(e) =>
                                                                        setEditingFormState((prev) => ({
                                                                            ...prev,
                                                                            note: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    placeholder="Description of this metadata"
                                                                />
                                                            </div>
                                                            <div className="flex justify-end space-x-3">
                                                                <button
                                                                    type="submit"
                                                                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                                                                >
                                                                    Update Metadata
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCancel}
                                                                    className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </form>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
