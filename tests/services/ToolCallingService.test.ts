import { ToolCallingService } from '@/services/ToolCallingService.ts';
import { aiFactory } from '@/services/AIFactory.ts';
import type { ToolCallDecision } from '@/types/tools.ts';

jest.mock('@/services/AIFactory.ts');

describe('ToolCallingService', () => {
    const mockGenerateStructuredContent = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (aiFactory as jest.Mock).mockReturnValue({
            generateStructuredContent: mockGenerateStructuredContent
        });
    });

    describe('Happy Path', () => {
        it('should select clip_video tool for single clip intent', async () => {
            const mockDecision: ToolCallDecision<'clip_video'> = {
                toolName: 'clip_video',
                parameters: {
                    sourceVideoId: 'video-123',
                    startTime: 12.5,
                    endTime: 45.0,
                    reasoning: 'Extracting segment matching prompt'
                },
                explanation: 'User requested single clip segment'
            };

            mockGenerateStructuredContent.mockResolvedValueOnce(mockDecision);

            const scenes = [{ id: 'scene-1', sourceVideoId: 'video-123', startTime: 12.5, endTime: 45.0 }];
            const decision = await ToolCallingService.decideVideoTool('extract the scene where eggs are beaten', scenes);

            expect(decision.toolName).toBe('clip_video');
            expect(decision.parameters.sourceVideoId).toBe('video-123');
            expect(decision.parameters.startTime).toBe(12.5);
            expect(decision.parameters.endTime).toBe(45.0);
        });

        it('should select remix_mixture tool for multi-clip montage intent', async () => {
            const mockDecision: ToolCallDecision<'remix_mixture'> = {
                toolName: 'remix_mixture',
                parameters: {
                    clips: [
                        { sourceVideoId: 'vid-1', startTime: 0, endTime: 10 },
                        { sourceVideoId: 'vid-2', startTime: 50, endTime: 75 }
                    ],
                    reasoning: 'Combining highlights across multiple sources'
                },
                explanation: 'Montage remix requested'
            };

            mockGenerateStructuredContent.mockResolvedValueOnce(mockDecision);

            const scenes = [
                { id: 'scene-1', sourceVideoId: 'vid-1', startTime: 0, endTime: 10 },
                { id: 'scene-2', sourceVideoId: 'vid-2', startTime: 50, endTime: 75 }
            ];

            const decision = await ToolCallingService.decideVideoTool('create a summary montage', scenes);

            expect(decision.toolName).toBe('remix_mixture');
            expect(decision.parameters.clips.length).toBe(2);
        });

        it('should select composite_videos tool for sequential playlist intent', async () => {
            const mockDecision: ToolCallDecision<'composite_videos'> = {
                toolName: 'composite_videos',
                parameters: {
                    sourceVideoIds: ['vid-1', 'vid-2', 'vid-3'],
                    reasoning: 'Playlist of top 3 videos'
                },
                explanation: 'Sequential composite playlist requested'
            };

            mockGenerateStructuredContent.mockResolvedValueOnce(mockDecision);

            const scenes = [
                { id: 'scene-1', sourceVideoId: 'vid-1' },
                { id: 'scene-2', sourceVideoId: 'vid-2' }
            ];

            const decision = await ToolCallingService.decideVideoTool('show me top 3 videos back to back', scenes);

            expect(decision.toolName).toBe('composite_videos');
            expect(decision.parameters.sourceVideoIds).toEqual(['vid-1', 'vid-2', 'vid-3']);
        });

        it('should select playback_video tool for single source video playback', async () => {
            const mockDecision: ToolCallDecision<'playback_video'> = {
                toolName: 'playback_video',
                parameters: {
                    sourceVideoId: 'vid-main-1',
                    reasoning: 'Play full video'
                },
                explanation: 'Direct single video playback'
            };

            mockGenerateStructuredContent.mockResolvedValueOnce(mockDecision);

            const scenes = [{ id: 'scene-1', sourceVideoId: 'vid-main-1' }];
            const decision = await ToolCallingService.decideVideoTool('play this full video', scenes);

            expect(decision.toolName).toBe('playback_video');
            expect(decision.parameters.sourceVideoId).toBe('vid-main-1');
        });
    });

    describe('Sad Path & Validation Errors', () => {
        it('should throw error when prompt parameter is missing or empty', async () => {
            await expect(ToolCallingService.decideVideoTool('', [])).rejects.toThrow('Prompt parameter is required');
            await expect(ToolCallingService.decideVideoTool(null as unknown as string, [])).rejects.toThrow('Prompt parameter is required');
        });

        it('should throw error when decision payload is missing toolName', () => {
            const invalidDecision = {
                parameters: {},
                explanation: 'Missing tool name'
            } as unknown as ToolCallDecision;

            expect(() => ToolCallingService.validateToolDecision(invalidDecision)).toThrow('Tool decision missing toolName');
        });

        it('should throw error for unsupported tool name', () => {
            const invalidDecision = {
                toolName: 'unknown_tool',
                parameters: {},
                explanation: 'Unknown tool'
            } as unknown as ToolCallDecision;

            expect(() => ToolCallingService.validateToolDecision(invalidDecision)).toThrow('Unsupported tool name: unknown_tool');
        });

        it('should throw validation error when clip_video has missing or invalid parameters', () => {
            const invalidDecision = {
                toolName: 'clip_video',
                parameters: {
                    sourceVideoId: '',
                    startTime: 10
                },
                explanation: 'Invalid parameters'
            } as unknown as ToolCallDecision;

            expect(() => ToolCallingService.validateToolDecision(invalidDecision)).toThrow('Invalid parameters for clip_video');
        });

        it('should throw validation error when composite_videos has empty sourceVideoIds', () => {
            const invalidDecision = {
                toolName: 'composite_videos',
                parameters: {
                    sourceVideoIds: []
                },
                explanation: 'Empty source video IDs'
            } as unknown as ToolCallDecision;

            expect(() => ToolCallingService.validateToolDecision(invalidDecision)).toThrow('Invalid parameters for composite_videos');
        });

        it('should throw validation error when remix_mixture has empty clips', () => {
            const invalidDecision = {
                toolName: 'remix_mixture',
                parameters: {
                    clips: []
                },
                explanation: 'Empty clips list'
            } as unknown as ToolCallDecision;

            expect(() => ToolCallingService.validateToolDecision(invalidDecision)).toThrow('Invalid parameters for remix_mixture');
        });

        it('should throw validation error when playback_video is missing sourceVideoId', () => {
            const invalidDecision = {
                toolName: 'playback_video',
                parameters: {
                    sourceVideoId: ''
                },
                explanation: 'Missing source video id'
            } as unknown as ToolCallDecision;

            expect(() => ToolCallingService.validateToolDecision(invalidDecision)).toThrow('Invalid parameters for playback_video');
        });

        it('should handle LLM provider exception during tool decision', async () => {
            mockGenerateStructuredContent.mockRejectedValueOnce(new Error('LLM Service Unavailable'));

            await expect(ToolCallingService.decideVideoTool('sample prompt', [])).rejects.toThrow('LLM Service Unavailable');
        });
    });
});
