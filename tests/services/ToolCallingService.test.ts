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

    it('should throw validation error when tool parameters are invalid', () => {
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
});
