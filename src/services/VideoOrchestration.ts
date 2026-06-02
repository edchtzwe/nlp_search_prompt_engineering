import { aiFactory } from '@/services/AIFactory.ts';
import { findSimilarScenes } from '@/models/video_scenes.ts';
import { PROVIDER_NAME } from '@/services/GoogleAIProvider.ts';
import { getVideoCompositesByCompositeUuid } from '@/models/video_composites.ts';
import { getVideoClip } from '@/models/video_clips.ts';
import { getVideoMixtureSources } from '@/models/video_mixtures.ts';

// Define the structure for the Judge's output
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

const SEARCH_PHRASE_COUNT = Number(process.env.SEARCH_PHRASE_COUNT) || 5;

export const VideoOrchestration = {
    // --- INTENT PARSER CONFIG ---
    buildSystemInstruction: (): string => {
        return [
            'You are a backend intent parser for a video processing API.',
            'You must always return a single JSON object that matches the provided JSON schema.',
            '',
            '### Actions Definitions',
            '- **PLAYBACK**: Retrieve a SINGLE, EXISTING video file.',
            '- **CLIP**: Extract a SINGLE, CONTINUOUS time segment from a SINGLE, EXISTING video file..',
            '- **COMPOSITE**: A sequential playlist of SINGLE, EXISTING videos (Top 5, List of...).',
            '- **MIXTURE**: Intelligent editing/remixing. This is a combination of COMPOSITE and CLIP. (Remove dialogue, Summary, Montage, "All intros").',
            '',
            '### Search Phrase Strategy (CRITICAL)',
            '1. **Literal Extraction**: If the user prompt contains specific keywords (e.g., "plating only"), you MUST include that EXACT phrase as the first item in `searchPhrases`.',
            '2. **Visuals NOT Commands**: Do NOT include command verbs like "extract", "find", "show me", or "remove" in the search phrases. These confuse the vector search.',
            '   - BAD: "extract plating segments"',
            '   - GOOD: "plating", "food presentation", "placing food on plate"',
            '3. **Reasoning Alignment**: If your `reasoning` identifies a specific subject (e.g., "The user wants plating"), that subject MUST be a search phrase.',
            '',
            '### Context-Aware Rules (Crucial)',
            'The user request is relative to the "Current Context" provided in the prompt.',
            '',
            '1. **IF Context is MIXTURE** (User is watching a montage/remix):',
            '   - Request: "Give me video 1" or "The first clip" -> **CLIP** (Extracting a segment from the mixture).',
            '   - Request: "All intros" or "Summary" -> **MIXTURE** (Remixing the remix).',
            '',
            '2. **IF Context is COMPOSITE** (User is watching a playlist):',
            '   - Request: "Give me video 1" -> **PLAYBACK** (Extracting a full video from the playlist).',
            '   - Request: "Make a summary" -> **MIXTURE**.',
            '   - Request: "Wants a specific segment (best vegan recipe) from the current composite, with modifications" -> **MIXTURE**.',
            '',
            '3. **IF Context is PLAYBACK** (User is watching a single video):',
            '   - Request: "Scene where..." -> **CLIP**.',
            '   - Request: "Play this video" -> **PLAYBACK**.',
            '',
            '### General Decision Logic',
            '1. **Explicit Editing?** (words like "remove", "clean", "highlight", "summary", "all the [x]") -> **MIXTURE**.',
            '2. **Specific Segment?** (words like "scene where", "quote") -> **CLIP**.',
            '3. **Explicit List/Plural?** ("Top 5", "List of", "Recipes") -> **COMPOSITE**.',
            '4. **Singular/Superlative?** ("The best", "Top rated") -> **PLAYBACK**.',
            '',
            '### JSON rules',
            '- Output ONLY JSON.',
        ].join('\n');
    },
    getResponseSchema: () => {
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
    // --- JUDGE CONFIG ---
    buildJudgeSystemInstruction: (): string => {
        return [
            'You are a precise Video Content Judge.',
            'You will receive a User Request and a list of Candidate Scenes found via vector search.',
            'Your job is to filter content based on the user\'s Explicit Constraints while being flexible with Implicit Context.',
            '',
            '### Evaluation Guidelines',
            '1. **Explicit Constraints (STRICT)**:',
            '   - If the user uses keywords like "Vegan", "Vegetarian", "No Meat", "Only", "Strictly" -> You MUST enforce these rigidly.',
            '   - "Vegan" REJECTS: Meat, Fish, Eggs, Dairy, Honey.',
            '   - "Vegetarian" REJECTS: Meat, Fish.',
            '   - "Only Plating" REJECTS: Cooking, Eating, Intros.',
            '',
            '2. **Implicit Intent (FLEXIBLE)**:',
            '   - If the user request is broad (e.g. "Asian recipes", "Cheap meals"), do NOT enforce unstated restrictions.',
            '   - Do NOT infer a "Vegan" constraint just because most results are vegan.',
            '   - Do NOT reject "Tuna" from an "Asian" request just because it lacks the keyword, if it fits the theme.',
            '',
            '3. **Context & Continuity**:',
            '   - Keep "Intro", "Outro", and "Result" scenes unless the user explicitly asks to remove them.',
            '   - Context is valuable. Err on the side of keeping it.',
            '',
            '4. **Inclusivity**:',
            '   - If multiple distinct videos match the request, keep them all.',
            '',
            '### Output',
            'Return a JSON object containing the `reasoning` for your decisions and the `validScenes` array.',
        ].join('\n');
    },
    getJudgeResponseSchema: () => {
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

    // --- EXECUTION ---
    semanticSearchScenes: async (prompt: string, sourceVideoIds?: string[]) => {
        const aiProvider = aiFactory(PROVIDER_NAME);
        const embedding = await aiProvider.generateEmbedding(prompt);
        const vectorString = JSON.stringify(embedding);

        const rows = await findSimilarScenes(vectorString, {
            sourceVideoIds
        });

        return rows.map(row => ({
            id: row.id,
            sourceVideoId: row.source_video_id,
            startTime: row.start_time,
            endTime: row.end_time,
            content: row.content,
            similarity: row.similarity,
            sourceVideo: row.source_video
        }));
    },
    async judgeScenes(originalPrompt: string, scenes: { id: string; [key: string]: unknown }[]) {
        if (scenes.length === 0) return [];

        const aiProvider = aiFactory(PROVIDER_NAME);

        const prompt = `
        User Request: "${originalPrompt}"
        
        Candidate Scenes (JSON):
        ${JSON.stringify(scenes)}
        `;

        const result = await aiProvider.generateStructuredContent<JudgeResponseJson>({
            prompt: prompt,
            systemInstruction: VideoOrchestration.buildJudgeSystemInstruction(),
            responseSchema: VideoOrchestration.getJudgeResponseSchema()
        });

        const validIds = new Set((result.validScenes || []).map(s => s.id));
        return scenes.filter(scene => validIds.has(scene.id));
    },

    async orchestrate(
        prompt: string,
        context?: { uuid: string; action: string }
    ) {
        const aiProvider = aiFactory(PROVIDER_NAME);
        let restrictedSourceIds: string[] | undefined = undefined;

        // Prepare context string for the AI
        let contextDescription = "None (Global Search)";
        if (context && context.uuid) {
            restrictedSourceIds = await this.getSourceIdsFromContext(context.uuid, context.action as VideoAction);
            contextDescription = `User is currently viewing a ${context.action} (UUID: ${context.uuid})`;
        }

        // 1. Get Intent
        const intentPrompt = `
        Current Context: ${contextDescription}
        User Request: "${prompt}"
        `;

        const intent = await aiProvider.generateStructuredContent<IntentJson>({
            prompt: intentPrompt,
            systemInstruction: VideoOrchestration.buildSystemInstruction(),
            responseSchema: VideoOrchestration.getResponseSchema()
        });

        intent?.searchPhrases.unshift(prompt);

        console.info(`User Intent: ${intent.action} | Reasoning: ${intent.reasoning}`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let resultData: any = intent;
        let foundScenes: { id: string; [key: string]: unknown }[] = [];
        let successfulPhrase = '';

        for (const phrase of intent.searchPhrases) {
            console.info(`[Composite] Testing phrase: "${phrase}"`);
            const scenes = await VideoOrchestration.semanticSearchScenes(phrase, restrictedSourceIds);

            if (scenes.length > 0) {
                foundScenes = scenes;
                successfulPhrase = phrase;
                break;
            }
        }

        // OPTIONAL: You can enable the Judge here if you want orchestrate to auto-filter
        // const validScenes = await VideoOrchestration.judgeScenes(prompt, foundScenes);
        // foundScenes = validScenes;

        resultData = {
            ...intent,
            successfulPhrase,
            foundScenes
        };

        return {
            success: true,
            message: foundScenes.length > 0
                ? `Semantic search successful using: "${successfulPhrase}"`
                : "Semantic search yielded no results.",
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
                return composites.map(row => row.sourceVideoId);
            }
            case 'CLIP': {
                const clip = await getVideoClip(uuid);
                return clip?.map(row => row.sourceVideoId);
            }
            case 'MIXTURE': {
                const mixtures = await getVideoMixtureSources(uuid);
                return mixtures.map(row => row.sourceVideoId);
            }
            case 'PLAYBACK':
            default:
                return [uuid];
        }
    }
};