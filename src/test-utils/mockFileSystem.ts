import path from 'path';

export class MockFileSystem {
    private files: Map<string, string> = new Map();
    private directories: Set<string> = new Set();

    constructor() {
        // Initialize with root directory
        this.directories.add('/');
    }

    public async readFile(filePath: string): Promise<string> {
        const normalizedPath = this.normalizePath(filePath);
        const content = this.files.get(normalizedPath);
        if (content === undefined) {
            throw new Error(`File not found: ${filePath}`);
        }
        return content;
    }

    public async writeFile(filePath: string, content: string): Promise<void> {
        const normalizedPath = this.normalizePath(filePath);
        const dirPath = path.dirname(normalizedPath);

        // Ensure directory exists
        if (!this.directories.has(dirPath)) {
            await this.mkdir(dirPath, { recursive: true });
        }

        this.files.set(normalizedPath, content);
    }

    public async mkdir(dirPath: string, options?: { recursive: boolean }): Promise<void> {
        const normalizedPath = this.normalizePath(dirPath);

        if (options?.recursive) {
            let currentPath = '';
            for (const part of normalizedPath.split('/').filter(Boolean)) {
                currentPath = path.join(currentPath, part);
                this.directories.add(currentPath);
            }
        } else {
            this.directories.add(normalizedPath);
        }
    }

    public async readdir(dirPath: string): Promise<string[]> {
        const normalizedPath = this.normalizePath(dirPath);
        if (!this.directories.has(normalizedPath)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }

        const entries = new Set<string>();

        // Add files
        for (const [filePath] of this.files) {
            if (filePath.startsWith(normalizedPath) && filePath !== normalizedPath) {
                const relativePath = filePath.slice(normalizedPath.length + 1);
                const firstPart = relativePath.split('/')[0];
                entries.add(firstPart);
            }
        }

        // Add directories
        for (const dir of this.directories) {
            if (dir.startsWith(normalizedPath) && dir !== normalizedPath) {
                const relativePath = dir.slice(normalizedPath.length + 1);
                const firstPart = relativePath.split('/')[0];
                entries.add(firstPart);
            }
        }

        return Array.from(entries);
    }

    public async exists(filePath: string): Promise<boolean> {
        const normalizedPath = this.normalizePath(filePath);
        return this.files.has(normalizedPath) || this.directories.has(normalizedPath);
    }

    public async unlink(filePath: string): Promise<void> {
        const normalizedPath = this.normalizePath(filePath);
        if (!this.files.has(normalizedPath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        this.files.delete(normalizedPath);
    }

    public async rmdir(dirPath: string): Promise<void> {
        const normalizedPath = this.normalizePath(dirPath);
        if (!this.directories.has(normalizedPath)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }

        // Check if directory is empty
        const entries = await this.readdir(normalizedPath);
        if (entries.length > 0) {
            throw new Error(`Directory not empty: ${dirPath}`);
        }

        this.directories.delete(normalizedPath);
    }

    private normalizePath(filePath: string): string {
        return path.normalize(filePath).replace(/\\/g, '/');
    }

    // Helper method to reset the mock filesystem
    public reset(): void {
        this.files.clear();
        this.directories.clear();
        this.directories.add('/');
    }
}
