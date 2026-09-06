import { VideoOrchestration } from '@/services/VideoOrchestration.ts';
import { aiFactory } from '@/services/AIFactory.ts';
import { findSimilarScenes } from '@/models/video_scenes.ts';
import { getVideoCompositesByCompositeUuid } from '@/models/video_composites.ts';
import { getVideoClip } from '@/models/video_clips.ts';
import { getVideoMixtureSources } from '@/models/video_mixtures.ts';

jest.mock('@/services/AIFactory.ts');
jest.mock('@/models/video_scenes.ts');
jest.mock('@/models/video_composites.ts');
jest.mock('@/models/video_clips.ts');
jest.mock('@/models/video_mixtures.ts');

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

    describe('Happy Path', () => {
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

        it('should filter candidate scenes using judge model with explicit constraints', async () => {
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

        it('should resolve source IDs from composite and mixture context', async () => {
            (getVideoCompositesByCompositeUuid as jest.Mock).mockResolvedValue([
                { sourceVideoId: 'src-1' },
                { sourceVideoId: 'src-2' }
            ]);
            (getVideoClip as jest.Mock).mockResolvedValue([
                { sourceVideoId: 'src-clip-1' }
            ]);
            (getVideoMixtureSources as jest.Mock).mockResolvedValue([
                { sourceVideoId: 'src-mix-1' }
            ]);

            const compositeSources = await VideoOrchestration.getSourceIdsFromContext('comp-uuid', 'COMPOSITE');
            const clipSources = await VideoOrchestration.getSourceIdsFromContext('clip-uuid', 'CLIP');
            const mixSources = await VideoOrchestration.getSourceIdsFromContext('mix-uuid', 'MIXTURE');
            const playbackSources = await VideoOrchestration.getSourceIdsFromContext('play-uuid', 'PLAYBACK');

            expect(compositeSources).toEqual(['src-1', 'src-2']);
            expect(clipSources).toEqual(['src-clip-1']);
            expect(mixSources).toEqual(['src-mix-1']);
            expect(playbackSources).toEqual(['play-uuid']);
        });
    });

    describe('Sad Path & Edge Cases', () => {
        it('should return empty array if judgeScenes is passed empty candidates', async () => {
            const validScenes = await VideoOrchestration.judgeScenes('find cooking', []);
            expect(validScenes).toEqual([]);
            expect(mockGenerateStructuredContent).not.toHaveBeenCalled();
        });

        it('should handle semantic search yielding zero matching candidate scenes', async () => {
            mockGenerateStructuredContent.mockResolvedValueOnce({
                originalPrompt: 'unobtainable scene query',
                reasoning: 'No scenes match this intent',
                action: 'PLAYBACK',
                searchPhrases: ['rare phrase 1', 'rare phrase 2']
            });

            mockGenerateEmbedding.mockResolvedValue([0.0, 0.0, 0.0]);
            (findSimilarScenes as jest.Mock).mockResolvedValue([]);

            const result = await VideoOrchestration.orchestrate('unobtainable scene query');

            expect(result.success).toBe(true);
            expect(result.message).toBe('Semantic search yielded no results.');
            expect(result.data.foundScenes).toEqual([]);
            expect(result.data.successfulPhrase).toBe('');
        });

        it('should handle AI provider failure during structured content generation', async () => {
            mockGenerateStructuredContent.mockRejectedValueOnce(new Error('LLM Provider Rate Limit Exceeded'));

            await expect(VideoOrchestration.orchestrate('trigger failure')).rejects.toThrow('LLM Provider Rate Limit Exceeded');
        });

        it('should handle embedding generation failure during semantic search', async () => {
            mockGenerateEmbedding.mockRejectedValueOnce(new Error('Embedding API Unavailable'));

            await expect(VideoOrchestration.semanticSearchScenes('test prompt')).rejects.toThrow('Embedding API Unavailable');
        });
    });
});
