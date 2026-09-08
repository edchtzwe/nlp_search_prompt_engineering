import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { AIProvider, GenerateStructuredOptions, TranscriptionResult } from '@/services/AIProvider.ts';
import { VideoOrchestration, type IntentJson } from './VideoOrchestration.ts';

export const PROVIDER_NAME = 'google';
export const EMBEDDING_MODEL = process.env.GOOGLE_AI_EMBEDDING_MODEL || 'text-embedding-005';
export const GENERATIVE_MODEL = process.env.GOOGLE_AI_GENERATIVE_MODEL || 'gemini-2.5-flash-lite';
export const AUDIO_MODEL = process.env.GOOGLE_AI_AUDIO_MODEL || GENERATIVE_MODEL;

const AI_API_MAX_RETRIES = Number(process.env.AI_API_MAX_RETRIES) || 1;
const AI_API_RETRY_AFTER_DELAY = Number(process.env.AI_API_RETRY_AFTER_DELAY) || 1000;

async function retryOperation<T>(operation: () => Promise<T>, retries = AI_API_MAX_RETRIES): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (retries > 0) {
            console.warn(`Operation failed, retrying in ${AI_API_RETRY_AFTER_DELAY}ms... (${retries} attempts left). Error: ${error}`);
            await new Promise(resolve => setTimeout(resolve, AI_API_RETRY_AFTER_DELAY));
            return retryOperation(operation, retries - 1);
        }
        console.error(`Operation failed after all retry attempts. Error: ${error}`);
        throw error;
    }
}

export const createGoogleAIProvider = (apiKey: string): AIProvider => {
    const genAI = new GoogleGenerativeAI(apiKey);

    return {
        generateEmbedding: async (text: string): Promise<number[]> => {
            return retryOperation(async () => {
                const model = genAI.getGenerativeModel({
                    model: EMBEDDING_MODEL,
                });

                const result = await model.embedContent({
                    content: {
                        parts: [{ text }],
                        role: 'user',
                    },
                    outputDimensionality: 768,
                } as Parameters<typeof model.embedContent>[0]);

                if (!result?.embedding?.values?.length) {
                    throw new Error('Empty embedding returned');
                }

                return result.embedding.values;
            });
        },
        getIntentFromPrompt: async (prompt: string): Promise<IntentJson> => {
            // Re-using the generic method we are about to write
            return await createGoogleAIProvider(apiKey).generateStructuredContent<IntentJson>({
                prompt,
                systemInstruction: VideoOrchestration.buildSystemInstruction(),
                responseSchema: VideoOrchestration.getResponseSchema()
            });
        },
        generateStructuredContent: async <T>(options: GenerateStructuredOptions): Promise<T> => {
            return retryOperation(async () => {
                const model = genAI.getGenerativeModel({
                    model: GENERATIVE_MODEL,
                    systemInstruction: options.systemInstruction,
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: options.responseSchema,
                    },
                });

                const result = await model.generateContent(options.prompt);
                const responseText = result.response.text();

                return JSON.parse(responseText) as T;
            });
        },
        transcribeAudio: async (audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult> => {
            return retryOperation(async () => {
                const model = genAI.getGenerativeModel({
                    model: AUDIO_MODEL,
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: SchemaType.OBJECT,
                            properties: {
                                prompt: {
                                    type: SchemaType.STRING,
                                    description: "The plain text transcription of the spoken audio, without timestamps or speaker labels.",
                                },
                            },
                            required: ['prompt'],
                        },
                    },
                });

                const result = await model.generateContent({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: mimeType,
                                        data: audioBuffer.toString('base64'),
                                    },
                                },
                                {
                                    text: "Transcribe the spoken audio into text. Do not include timestamps, timecodes, or speaker labels. Return only the spoken words.",
                                },
                            ],
                        },
                    ],
                });

                const responseText = result.response.text();
                const parsed = JSON.parse(responseText);

                return {
                    prompt: parsed.prompt,
                    raw: result.response,
                };
            });
        }
    };
};