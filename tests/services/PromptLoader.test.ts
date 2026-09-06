import { PromptLoader } from '@/services/PromptLoader.ts';
import fs from 'node:fs';

jest.mock('node:fs');

describe('PromptLoader Service', () => {
    beforeEach(() => {
        PromptLoader.clearCache();
        jest.clearAllMocks();
    });

    it('should read prompt file and return trimmed content', () => {
        const mockPrompt = 'You are a test assistant.\n\n';
        (fs.readFileSync as jest.Mock).mockReturnValue(mockPrompt);

        const result = PromptLoader.loadPrompt('test_prompt.md');

        expect(result).toBe('You are a test assistant.');
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should cache loaded prompts on subsequent calls', () => {
        const mockPrompt = 'Cached prompt text';
        (fs.readFileSync as jest.Mock).mockReturnValue(mockPrompt);

        const firstResult = PromptLoader.loadPrompt('cached.md');
        const secondResult = PromptLoader.loadPrompt('cached.md');

        expect(firstResult).toBe(mockPrompt);
        expect(secondResult).toBe(mockPrompt);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when prompt relative path is missing or invalid', () => {
        expect(() => PromptLoader.loadPrompt('')).toThrow('Invalid prompt relative path provided');
    });

    it('should throw descriptive error when file read fails', () => {
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
        });

        expect(() => PromptLoader.loadPrompt('non_existent.md')).toThrow('Prompt file not found: non_existent.md');
    });
});
