import { PROMPTBOOK_ENGINE_VERSION } from '@promptbook-local/components';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

export type UtilityMetadata = {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    author: string;
    version: string;
    repository: string;
    dependencies: Record<string, string>;
    props: Record<
        string,
        {
            type: string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            default?: any;
            description: string;
            required?: boolean;
        }
    >;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    types?: Record<string, any>;
    features: string[];
    examples: Array<{
        title: string;
        code: string;
    }>;
    type: 'miniapp' | 'documentation';
};

export function getAllUtilities(): UtilityMetadata[] {
    const utilitiesDir = path.join(process.cwd(), 'src/utilities');

    if (!fs.existsSync(utilitiesDir)) {
        return [];
    }

    const utilityFolders = fs
        .readdirSync(utilitiesDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    const utilities: UtilityMetadata[] = [];

    for (const folder of utilityFolders) {
        const utilityJsonPath = path.join(utilitiesDir, folder, 'utility.json');
        const utilityYamlPath = path.join(utilitiesDir, folder, 'utility.yml');
        const utilityYamlPath2 = path.join(utilitiesDir, folder, 'utility.yaml');

        let utilityData: Partial<UtilityMetadata>;

        if (fs.existsSync(utilityYamlPath)) {
            try {
                utilityData = yaml.load(fs.readFileSync(utilityYamlPath, 'utf-8')) as Partial<UtilityMetadata>;
            } catch (error) {
                console.error(`Error loading utility metadata for ${folder}:`, error);
                continue;
            }
        } else if (fs.existsSync(utilityYamlPath2)) {
            try {
                utilityData = yaml.load(fs.readFileSync(utilityYamlPath2, 'utf-8')) as Partial<UtilityMetadata>;
            } catch (error) {
                console.error(`Error loading utility metadata for ${folder}:`, error);
                continue;
            }
        } else if (fs.existsSync(utilityJsonPath)) {
            try {
                utilityData = JSON.parse(fs.readFileSync(utilityJsonPath, 'utf-8')) as Partial<UtilityMetadata>;
            } catch (error) {
                console.error(`Error loading utility metadata for ${folder}:`, error);
                continue;
            }
        } else {
            continue;
        }

        try {
            utilityData.version = utilityData.version || PROMPTBOOK_ENGINE_VERSION;
            utilityData.repository = utilityData.repository || 'https://github.com/webgptorg/promptbook';
            utilityData.author = utilityData.author || 'Promptbook Team';
            utilityData.tags = utilityData.tags || [];
            utilityData.dependencies = utilityData.dependencies || {
                react: '^18.0.0 || ^19.0.0', // <- TODO: Is this correct?
                '@promptbook/components': PROMPTBOOK_ENGINE_VERSION,
            };

            utilities.push(utilityData as UtilityMetadata);
        } catch (error) {
            console.error(`Error loading utility metadata for ${folder}:`, error);
        }
    }

    return utilities.sort((a, b) => a.name.localeCompare(b.name));
}

export function getUtilityById(id: string): UtilityMetadata | null {
    const utilities = getAllUtilities();
    return utilities.find((utility) => utility.id === id) || null;
}

export function getUtilitiesByCategory(): Record<string, UtilityMetadata[]> {
    const utilities = getAllUtilities();
    const categorized: Record<string, UtilityMetadata[]> = {};

    for (const utility of utilities) {
        if (!categorized[utility.category]) {
            categorized[utility.category] = [];
        }
        categorized[utility.category].push(utility);
    }

    return categorized;
}

export function searchUtilities(query: string): UtilityMetadata[] {
    const utilities = getAllUtilities();
    const lowercaseQuery = query.toLowerCase();

    return utilities.filter(
        (utility) =>
            utility.name.toLowerCase().includes(lowercaseQuery) ||
            utility.description.toLowerCase().includes(lowercaseQuery) ||
            utility.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)) ||
            utility.category.toLowerCase().includes(lowercaseQuery),
    );
}
