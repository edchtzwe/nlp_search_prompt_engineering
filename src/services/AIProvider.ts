import type { IntentJson } from "@/services/VideoOrchestration.ts";

export interface GenerateStructuredOptions {
    prompt: string;
    systemInstruction: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    responseSchema: any;
}

export interface TranscriptionResult {
    prompt: string;
    raw: unknown; 
}

export interface AIProvider {
    generateEmbedding(text: string): Promise<number[]>;
    getIntentFromPrompt(prompt: string): Promise<IntentJson>;
    generateStructuredContent<T>(options: GenerateStructuredOptions): Promise<T>;
    transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult>;
}
