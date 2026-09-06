import { api } from '../request';
import { VideoOrchestration } from '@/services/VideoOrchestration.ts';

jest.mock('@/services/VideoOrchestration.ts');

describe('GraphQL: Natural Language Processing Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should query searchScenes via GraphQL', async () => {
        (VideoOrchestration.semanticSearchScenes as jest.Mock).mockResolvedValue([
            {
                id: 'scene-1',
                sourceVideoId: 'video-123',
                startTime: 10,
                endTime: 25,
                content: 'Sample scene search result',
                similarity: 0.92
            }
        ]);

        const query = `
            query SearchScenes($prompt: String!, $videoUuid: String) {
                searchScenes(prompt: $prompt, videoUuid: $videoUuid) {
                    id
                    sourceVideoId
                    startTime
                    endTime
                    content
                    similarity
                }
            }
        `;

        const response = await api
            .post('graphql')
            .send({ query, variables: { prompt: 'cooking steak', videoUuid: 'video-123' } });

        expect(response.status).toBe(200);
        expect(VideoOrchestration.semanticSearchScenes).toHaveBeenCalledWith('cooking steak', ['video-123']);
    });

    it('should execute handleVideoOrchestration mutation', async () => {
        (VideoOrchestration.orchestrate as jest.Mock).mockResolvedValue({
            success: true,
            message: 'Semantic search successful',
            data: {
                originalPrompt: 'extract highlights',
                reasoning: 'User wants highlights',
                action: 'MIXTURE',
                searchPhrases: ['highlights'],
                successfulPhrase: 'highlights',
                foundScenes: []
            }
        });

        const query = `
            mutation HandleVideoOrchestration($prompt: String!, $context: VideoContextInput) {
                handleVideoOrchestration(prompt: $prompt, context: $context) {
                    success
                    message
                }
            }
        `;

        const response = await api
            .post('graphql')
            .send({
                query,
                variables: {
                    prompt: 'extract highlights',
                    context: { uuid: 'vid-1', action: 'PLAYBACK' }
                }
            });

        expect(response.status).toBe(200);
        expect(VideoOrchestration.orchestrate).toHaveBeenCalledWith('extract highlights', {
            uuid: 'vid-1',
            action: 'PLAYBACK'
        });
    });
});
