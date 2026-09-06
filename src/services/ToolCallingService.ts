import { aiFactory } from '@/services/AIFactory.ts';
import { PROVIDER_NAME } from '@/services/GoogleAIProvider.ts';
import { PromptLoader } from '@/services/PromptLoader.ts';
import type {
    ToolCallDecision,
    VideoToolName,
    ClipVideoToolArgs,
    CompositeVideosToolArgs,
    RemixMixtureToolArgs,
    PlaybackVideoToolArgs
} from '@/types/tools.ts';

const ORCHESTRATION_TOOLS_PROMPT_PATH = 'orchestration_tools.md';

const TOOL_RESPONSE_SCHEMA = {
    type: 'object' as const,
    properties: {
        toolName: {
            type: 'string',
            enum: ['clip_video', 'composite_videos', 'remix_mixture', 'playback_video']
        },
        parameters: {
            type: 'object',
            properties: {
                sourceVideoId: { type: 'string' },
                sourceVideoIds: {
                    type: 'array',
                    items: { type: 'string' }
                },
                startTime: { type: 'number' },
                endTime: { type: 'number' },
                clips: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            sourceVideoId: { type: 'string' },
                            startTime: { type: 'number' },
                            endTime: { type: 'number' }
                        },
                        required: ['sourceVideoId', 'startTime', 'endTime']
                    }
                },
                reasoning: { type: 'string' }
            }
        },
        explanation: { type: 'string' }
    },
    required: ['toolName', 'parameters', 'explanation']
};

export const ToolCallingService = {
    getSystemInstruction(): string {
        return PromptLoader.loadPrompt(ORCHESTRATION_TOOLS_PROMPT_PATH);
    },

    getToolResponseSchema(): Record<string, unknown> {
        return TOOL_RESPONSE_SCHEMA;
    },

    async decideVideoTool(
        prompt: string,
        scenes: { id: string; sourceVideoId?: string; startTime?: number; endTime?: number; content?: string }[]
    ): Promise<ToolCallDecision> {
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Prompt parameter is required');
        }

        const aiProvider = aiFactory(PROVIDER_NAME);

        const promptPayload = `
User Prompt: "${prompt}"

Filtered Candidate Scenes (JSON):
${JSON.stringify(scenes ?? [])}
`;

        const decision = await aiProvider.generateStructuredContent<ToolCallDecision>({
            prompt: promptPayload,
            systemInstruction: ToolCallingService.getSystemInstruction(),
            responseSchema: ToolCallingService.getToolResponseSchema()
        });

        ToolCallingService.validateToolDecision(decision);

        return decision;
    },

    validateToolDecision(decision: ToolCallDecision): void {
        if (!decision?.toolName) {
            throw new Error('Tool decision missing toolName');
        }

        switch (decision.toolName as VideoToolName) {
            case 'clip_video': {
                const params = decision.parameters as ClipVideoToolArgs;
                if (!params?.sourceVideoId || typeof params.startTime !== 'number' || typeof params.endTime !== 'number') {
                    throw new Error('Invalid parameters for clip_video');
                }
                break;
            }
            case 'composite_videos': {
                const params = decision.parameters as CompositeVideosToolArgs;
                if (!Array.isArray(params?.sourceVideoIds) || params.sourceVideoIds.length === 0) {
                    throw new Error('Invalid parameters for composite_videos');
                }
                break;
            }
            case 'remix_mixture': {
                const params = decision.parameters as RemixMixtureToolArgs;
                if (!Array.isArray(params?.clips) || params.clips.length === 0) {
                    throw new Error('Invalid parameters for remix_mixture');
                }
                break;
            }
            case 'playback_video': {
                const params = decision.parameters as PlaybackVideoToolArgs;
                if (!params?.sourceVideoId) {
                    throw new Error('Invalid parameters for playback_video');
                }
                break;
            }
            default:
                throw new Error(`Unsupported tool name: ${decision.toolName}`);
        }
    }
};
