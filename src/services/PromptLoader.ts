import fs from 'node:fs';
import path from 'node:path';

const PROMPT_CACHE = new Map<string, string>();

export const PromptLoader = {
    loadPrompt(promptRelativePath: string): string {
        if (!promptRelativePath || typeof promptRelativePath !== 'string') {
            throw new Error('Invalid prompt relative path provided');
        }

        const cached = PROMPT_CACHE.get(promptRelativePath);
        if (cached !== undefined) {
            return cached;
        }

        const candidateBasePath = path.resolve(__dirname, '..', 'prompts');
        const resolvedPath = path.resolve(candidateBasePath, promptRelativePath);

        try {
            const content = fs.readFileSync(resolvedPath, 'utf-8').trim();
            PROMPT_CACHE.set(promptRelativePath, content);
            return content;
        } catch (error) {
            console.error(`Failed to load prompt at path: ${resolvedPath}`, error);
            throw new Error(`Prompt file not found: ${promptRelativePath}`);
        }
    },

    clearCache(): void {
        PROMPT_CACHE.clear();
    }
};
