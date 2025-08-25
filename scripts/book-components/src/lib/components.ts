import fs from 'fs';
import path from 'path';

export interface ComponentMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  repository: string;
  dependencies: Record<string, string>;
  props: Record<string, {
    type: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default?: any;
    description: string;
    required?: boolean;
  }>;

   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  types?: Record<string, any>;
  features: string[];
  examples: Array<{
    title: string;
    code: string;
  }>;
}

export function getAllComponents(): ComponentMetadata[] {
  const componentsDir = path.join(process.cwd(), 'src/components');
  
  if (!fs.existsSync(componentsDir)) {
    return [];
  }

  const componentFolders = fs.readdirSync(componentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const components: ComponentMetadata[] = [];

  for (const folder of componentFolders) {
    const componentJsonPath = path.join(componentsDir, folder, 'component.json');
    
    if (fs.existsSync(componentJsonPath)) {
      try {
        const componentData = JSON.parse(fs.readFileSync(componentJsonPath, 'utf-8'));
        components.push(componentData);
      } catch (error) {
        console.error(`Error loading component metadata for ${folder}:`, error);
      }
    }
  }

  return components.sort((a, b) => a.name.localeCompare(b.name));
}

export function getComponentById(id: string): ComponentMetadata | null {
  const components = getAllComponents();
  return components.find(component => component.id === id) || null;
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

  return components.filter(component => 
    component.name.toLowerCase().includes(lowercaseQuery) ||
    component.description.toLowerCase().includes(lowercaseQuery) ||
    component.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
    component.category.toLowerCase().includes(lowercaseQuery)
  );
}
