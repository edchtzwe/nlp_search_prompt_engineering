import { VideoOrchestration } from '@/services/VideoOrchestration.ts';
import { aiFactory } from '@/services/AIFactory.ts';
import { findSimilarScenes } from '@/models/video_scenes.ts';

jest.mock('@/services/AIFactory.ts');
jest.mock('@/models/video_scenes.ts');

describe('VideoOrchestration Service', () => {
    const mockGenerateStructuredContent = jest.fn();
    const mockGenerateEmbedding = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (aiFactory as jest.Mock).mockReturnValue({
            generateStructuredContent: mockGenerateStructuredContent,
            generateEmbedding: mockGenerateEmbedding
        });
    });

    it('should parse user intent and perform fallback search across search phrases', async () => {
        mockGenerateStructuredContent.mockResolvedValueOnce({
            originalPrompt: 'find ramen broth recipe',
            reasoning: 'User wants broth preparation scenes',
            action: 'CLIP',
            searchPhrases: ['ramen broth', 'soup base preparation']
        });

        mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        (findSimilarScenes as jest.Mock)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                {
                    id: 'scene-1',
                    source_video_id: 'vid-100',
                    start_time: 10,
                    end_time: 35,
                    content: 'Boiling tonkotsu broth',
                    similarity: 0.89,
                    source_video: {}
                }
            ]);

        const result = await VideoOrchestration.orchestrate('find ramen broth recipe');

        expect(result.success).toBe(true);
        expect(result.data.action).toBe('CLIP');
        expect(result.data.foundScenes.length).toBe(1);
        expect(result.data.foundScenes[0].id).toBe('scene-1');
        expect(result.data.successfulPhrase).toBe('ramen broth');
    });

    it('should filter candidate scenes using judge model', async () => {
        mockGenerateStructuredContent.mockResolvedValueOnce({
            reasoning: 'Filtering out non-vegan dishes',
            validScenes: [
                {
                    id: 'scene-vegan-1',
                    sourceVideoId: 'vid-1',
                    startTime: 0,
                    endTime: 20,
                    content: 'Vegan salad',
                    similarity: 0.95
                }
            ]
        });

        const candidates = [
            { id: 'scene-vegan-1', content: 'Vegan salad' },
            { id: 'scene-meat-2', content: 'Beef steak' }
        ];

        const validScenes = await VideoOrchestration.judgeScenes('vegan recipes only', candidates);

        expect(validScenes.length).toBe(1);
        expect(validScenes[0].id).toBe('scene-vegan-1');
    });
});
