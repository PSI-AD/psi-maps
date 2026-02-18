import { Project } from '../types';

export const generateCleanId = (project: Project): string => {
    const name = project.name || 'untitled-project';
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};
