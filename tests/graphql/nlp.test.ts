import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import fs from 'node:fs';
import path from 'node:path';
import { resolvers as nlpResolvers } from '@/graphql/resolvers/NaturalLanguageProcessing.ts';
import { VideoOrchestration } from '@/services/VideoOrchestration.ts';

jest.mock('@/services/VideoOrchestration.ts');

const typeDefs = fs.readFileSync(path.resolve(__dirname, '../../src/graphql/schema.graphql'), 'utf-8');

const testSchema = makeExecutableSchema({
    typeDefs,
    resolvers: [nlpResolvers],
});

describe('GraphQL: Natural Language Processing Resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Happy Path', () => {
        it('should query searchScenes via GraphQL schema', async () => {
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

            const result = await graphql({
                schema: testSchema,
                source: query,
                variableValues: { prompt: 'cooking steak', videoUuid: 'video-123' }
            });

            expect(result.errors).toBeUndefined();
            expect(result.data?.searchScenes).toBeDefined();
            const searchScenes = result.data?.searchScenes as Array<{ id: string }>;
            expect(searchScenes.length).toBe(1);
            expect(searchScenes[0].id).toBe('scene-1');
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
                    negativeConstraints: [],
                    successfulPhrase: 'highlights',
                    foundScenes: []
                }
            });

            const mutation = `
                mutation HandleVideoOrchestration($prompt: String!, $context: OrchestrationContextInput) {
                    handleVideoOrchestration(prompt: $prompt, context: $context) {
                        success
                        message
                        data {
                            originalPrompt
                            reasoning
                            action
                            searchPhrases
                            negativeConstraints
                            successfulPhrase
                        }
                    }
                }
            `;

            const result = await graphql({
                schema: testSchema,
                source: mutation,
                variableValues: {
                    prompt: 'extract highlights',
                    context: { uuid: 'vid-1', action: 'PLAYBACK' }
                }
            });

            expect(result.errors).toBeUndefined();
            const data = result.data?.handleVideoOrchestration as { success: boolean; message: string };
            expect(data?.success).toBe(true);
            expect(VideoOrchestration.orchestrate).toHaveBeenCalledWith('extract highlights', {
                uuid: 'vid-1',
                action: 'PLAYBACK'
            });
        });

        it('should execute judgeVideoScenes mutation', async () => {
            (VideoOrchestration.judgeScenes as jest.Mock).mockResolvedValue([
                {
                    id: 'scene-1',
                    sourceVideoId: 'video-123',
                    startTime: 0,
                    endTime: 15,
                    content: 'Vegan salad preparation',
                    similarity: 0.95
                }
            ]);

            const mutation = `
                mutation JudgeVideoScenes($prompt: String!, $scenes: [VideoSceneInput!]!) {
                    judgeVideoScenes(prompt: $prompt, scenes: $scenes) {
                        id
                        sourceVideoId
                        startTime
                        endTime
                        content
                    }
                }
            `;

            const scenesInput = [
                {
                    id: 'scene-1',
                    sourceVideoId: 'video-123',
                    startTime: 0,
                    endTime: 15,
                    content: 'Vegan salad preparation',
                    similarity: 0.95
                }
            ];

            const result = await graphql({
                schema: testSchema,
                source: mutation,
                variableValues: {
                    prompt: 'vegan dishes only',
                    scenes: scenesInput
                }
            });

            expect(result.errors).toBeUndefined();
            const scenes = result.data?.judgeVideoScenes as Array<{ id: string }>;
            expect(scenes?.length).toBe(1);
            expect(VideoOrchestration.judgeScenes).toHaveBeenCalledWith('vegan dishes only', scenesInput);
        });
    });

    describe('Sad Path', () => {
        it('should return GraphQL syntax/validation errors for missing required parameters', async () => {
            const query = `
                query SearchScenes($prompt: String!) {
                    searchScenes(prompt: $prompt) {
                        id
                    }
                }
            `;

            const result = await graphql({
                schema: testSchema,
                source: query,
                variableValues: {}
            });

            expect(result.errors).toBeDefined();
            expect(result.errors?.length).toBeGreaterThan(0);
        });
    });
});
