import { aiFactory } from '@/services/AIFactory.ts';
import { findSimilarScenes } from '@/models/video_scenes.ts';
import { PROVIDER_NAME } from '@/services/GoogleAIProvider.ts';
import { getVideoCompositesByCompositeUuid } from '@/models/video_composites.ts';
import { getVideoClip } from '@/models/video_clips.ts';
import { getVideoMixtureSources } from '@/models/video_mixtures.ts';
import { PromptLoader } from '@/services/PromptLoader.ts';
import { ToolCallingService } from '@/services/ToolCallingService.ts';
import type { ToolCallDecision } from '@/types/tools.ts';

export interface JudgeResponseJson {
    reasoning: string;
    validScenes: {
        id: string;
        sourceVideoId: string;
        startTime: number;
        endTime: number;
        content: string;
        similarity: number;
    }[];
}

export type VideoAction = 'PLAYBACK' | 'CLIP' | 'COMPOSITE' | 'MIXTURE';

export interface IntentJson {
    originalPrompt: string;
    reasoning: string;
    action: VideoAction;
    searchPhrases: string[];
}

export interface OrchestrationResult {
    success: boolean;
    message: string;
    data: {
        originalPrompt: string;
        reasoning: string;
        action: VideoAction;
        searchPhrases: string[];
        successfulPhrase: string;
        foundScenes: { id: string; [key: string]: unknown }[];
        toolDecision?: ToolCallDecision;
    };
}

const SEARCH_PHRASE_COUNT = Number(process.env.SEARCH_PHRASE_COUNT) || 5;
const INTENT_PROMPT_PATH = 'intent_parser.md';
const JUDGE_PROMPT_PATH = 'video_judge.md';

export const VideoOrchestration = {
    buildSystemInstruction(): string {
        return PromptLoader.loadPrompt(INTENT_PROMPT_PATH);
    },

    getResponseSchema(): Record<string, unknown> {
        return {
            type: 'object' as const,
            properties: {
                originalPrompt: { type: 'string' },
                reasoning: { type: 'string' },
                action: {
                    type: 'string',
                    enum: ['PLAYBACK', 'CLIP', 'COMPOSITE', 'MIXTURE'],
                },
                searchPhrases: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: SEARCH_PHRASE_COUNT,
                },
            },
            required: ['originalPrompt', 'reasoning', 'action', 'searchPhrases'],
        };
    },

    buildJudgeSystemInstruction(): string {
        return PromptLoader.loadPrompt(JUDGE_PROMPT_PATH);
    },

    getJudgeResponseSchema(): Record<string, unknown> {
        return {
            type: 'object' as const,
            properties: {
                reasoning: { type: 'string' },
                validScenes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            sourceVideoId: { type: 'string' },
                            startTime: { type: 'number' },
                            endTime: { type: 'number' },
                            content: { type: 'string' },
                            similarity: { type: 'number' }
                        },
                        required: ['id', 'sourceVideoId', 'startTime', 'endTime', 'content']
                    }
                }
            },
            required: ['reasoning', 'validScenes'],
        };
    },

    async semanticSearchScenes(
        prompt: string,
        sourceVideoIds?: string[]
    ): Promise<{ id: string; sourceVideoId: string; startTime: number; endTime: number; content: string; similarity: number; sourceVideo: unknown }[]> {
        const aiProvider = aiFactory(PROVIDER_NAME);
        const embedding = await aiProvider.generateEmbedding(prompt);
        const vectorString = JSON.stringify(embedding);

        const rows = await findSimilarScenes(vectorString, {
            sourceVideoIds
        });

        return rows.map((row) => ({
            id: row.id,
            sourceVideoId: row.source_video_id,
            startTime: row.start_time,
            endTime: row.end_time,
            content: row.content,
            similarity: row.similarity,
            sourceVideo: row.source_video
        }));
    },

    async judgeScenes(
        originalPrompt: string,
        scenes: { id: string; [key: string]: unknown }[]
    ): Promise<{ id: string; [key: string]: unknown }[]> {
        if (!scenes || scenes.length === 0) {
            return [];
        }

        const aiProvider = aiFactory(PROVIDER_NAME);

        const prompt = `
User Request: "${originalPrompt}"

Candidate Scenes (JSON):
${JSON.stringify(scenes)}
`;

        const result = await aiProvider.generateStructuredContent<JudgeResponseJson>({
            prompt,
            systemInstruction: VideoOrchestration.buildJudgeSystemInstruction(),
            responseSchema: VideoOrchestration.getJudgeResponseSchema()
        });

        const validIds = new Set((result?.validScenes ?? []).map((scene) => scene.id));
        return scenes.filter((scene) => validIds.has(scene.id));
    },

    async orchestrate(
        prompt: string,
        context?: { uuid: string; action: string }
    ): Promise<OrchestrationResult> {
        const aiProvider = aiFactory(PROVIDER_NAME);
        let restrictedSourceIds: string[] | undefined;

        let contextDescription = 'None (Global Search)';
        if (context?.uuid && context?.action) {
            restrictedSourceIds = await this.getSourceIdsFromContext(context.uuid, context.action as VideoAction);
            contextDescription = `User is currently viewing a ${context.action} (UUID: ${context.uuid})`;
        }

        const intentPrompt = `
Current Context: ${contextDescription}
User Request: "${prompt}"
`;

        const intent = await aiProvider.generateStructuredContent<IntentJson>({
            prompt: intentPrompt,
            systemInstruction: VideoOrchestration.buildSystemInstruction(),
            responseSchema: VideoOrchestration.getResponseSchema()
        });

        if (intent?.searchPhrases) {
            intent.searchPhrases.unshift(prompt);
        }

        console.info(`User Intent: ${intent?.action} | Reasoning: ${intent?.reasoning}`);

        let foundScenes: { id: string; [key: string]: unknown }[] = [];
        let successfulPhrase = '';

        const searchPhrases = intent?.searchPhrases ?? [prompt];
        for (const phrase of searchPhrases) {
            console.info(`[Composite] Testing phrase: "${phrase}"`);
            const scenes = await VideoOrchestration.semanticSearchScenes(phrase, restrictedSourceIds);

            if (scenes.length > 0) {
                foundScenes = scenes;
                successfulPhrase = phrase;
                break;
            }
        }

        let toolDecision: ToolCallDecision | undefined;
        if (foundScenes.length > 0) {
            try {
                toolDecision = await ToolCallingService.decideVideoTool(prompt, foundScenes);
            } catch (error) {
                console.warn('Tool calling step skipped or encountered error:', error);
            }
        }

        const resultData = {
            originalPrompt: intent?.originalPrompt ?? prompt,
            reasoning: intent?.reasoning ?? '',
            action: intent?.action ?? 'PLAYBACK',
            searchPhrases,
            successfulPhrase,
            foundScenes,
            toolDecision
        };

        return {
            success: true,
            message: foundScenes.length > 0
                ? `Semantic search successful using: "${successfulPhrase}"`
                : 'Semantic search yielded no results.',
            data: resultData
        };
    },

    async getSourceIdsFromContext(
        uuid: string,
        action: 'COMPOSITE' | 'MIXTURE' | 'CLIP' | 'PLAYBACK'
    ): Promise<string[] | undefined> {
        switch (action) {
            case 'COMPOSITE': {
                const composites = await getVideoCompositesByCompositeUuid(uuid);
                return composites?.map((row) => row.sourceVideoId);
            }
            case 'CLIP': {
                const clip = await getVideoClip(uuid);
                return clip?.map((row) => row.sourceVideoId);
            }
            case 'MIXTURE': {
                const mixtures = await getVideoMixtureSources(uuid);
                return mixtures?.map((row) => row.sourceVideoId);
            }
            case 'PLAYBACK':
            default:
                return [uuid];
        }
    }
};
