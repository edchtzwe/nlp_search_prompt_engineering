import type { AIProvider } from "@/services/AIProvider.ts";
import { createGoogleAIProvider } from "@/services/GoogleAIProvider.ts";

export function aiFactory(provider: string): AIProvider {
    const apiKey = process.env.GOOGLE_AI_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_AI_KEY is not set in environment variables');
    }

    switch (provider.toLowerCase()) {
        case 'google':
            return createGoogleAIProvider(apiKey);

        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }
}