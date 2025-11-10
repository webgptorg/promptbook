import { PROMPTBOOK_ENGINE_VERSION } from '@promptbook-local/components';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

export type ComponentMetadata = {
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
};

export function getAllComponents(): ComponentMetadata[] {
    const componentsDir = path.join(process.cwd(), 'src/components');

    if (!fs.existsSync(componentsDir)) {
        return [];
    }

    const componentFolders = fs
        .readdirSync(componentsDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    const components: ComponentMetadata[] = [];

    for (const folder of componentFolders) {
        const componentJsonPath = path.join(componentsDir, folder, 'component.json');
        const componentYamlPath = path.join(componentsDir, folder, 'component.yml');
        const componentYamlPath2 = path.join(componentsDir, folder, 'component.yaml');

        let componentData: Partial<ComponentMetadata>;

        if (fs.existsSync(componentYamlPath)) {
            try {
                componentData = yaml.load(fs.readFileSync(componentYamlPath, 'utf-8')) as Partial<ComponentMetadata>;
            } catch (error) {
                console.error(`Error loading component metadata for ${folder}:`, error);
                continue;
            }
        } else if (fs.existsSync(componentYamlPath2)) {
            try {
                componentData = yaml.load(fs.readFileSync(componentYamlPath2, 'utf-8')) as Partial<ComponentMetadata>;
            } catch (error) {
                console.error(`Error loading component metadata for ${folder}:`, error);
                continue;
            }
        } else if (fs.existsSync(componentJsonPath)) {
            try {
                componentData = JSON.parse(fs.readFileSync(componentJsonPath, 'utf-8')) as Partial<ComponentMetadata>;
            } catch (error) {
                console.error(`Error loading component metadata for ${folder}:`, error);
                continue;
            }
        } else {
            continue;
        }

        try {
            componentData.version = componentData.version || PROMPTBOOK_ENGINE_VERSION;
            componentData.repository = componentData.repository || 'https://github.com/webgptorg/promptbook';
            componentData.author = componentData.author || 'Promptbook Team';
            componentData.tags = componentData.tags || [];
            componentData.dependencies = componentData.dependencies || {
                react: '^18.0.0 || ^19.0.0', // <- TODO: Is this correct?
                '@promptbook/components': PROMPTBOOK_ENGINE_VERSION,
            };

            components.push(componentData as ComponentMetadata);
        } catch (error) {
            console.error(`Error loading component metadata for ${folder}:`, error);
        }
    }

    return components.sort((a, b) => a.name.localeCompare(b.name));
}

export function getComponentById(id: string): ComponentMetadata | null {
    const components = getAllComponents();
    return components.find((component) => component.id === id) || null;
}

export function getComponentsByCategory(): Record<string, ComponentMetadata[]> {
    const components = getAllComponents();
    const categorized: Record<string, ComponentMetadata[]> = {};

    for (const component of components) {
        if (!categorized[component.category]) {
            categorized[component.category] = [];
        }
        categorized[component.category].push(component);
    }

    return categorized;
}

export function searchComponents(query: string): ComponentMetadata[] {
    const components = getAllComponents();
    const lowercaseQuery = query.toLowerCase();

    return components.filter(
        (component) =>
            component.name.toLowerCase().includes(lowercaseQuery) ||
            component.description.toLowerCase().includes(lowercaseQuery) ||
            component.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)) ||
            component.category.toLowerCase().includes(lowercaseQuery),
    );
}
