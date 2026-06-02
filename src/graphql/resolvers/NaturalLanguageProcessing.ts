import { VideoOrchestration } from '@/services/VideoOrchestration.ts';

export const resolvers = {
    Query: {
        searchScenes: async (_: unknown, { prompt, videoUuid }: { prompt: string, videoUuid?: string }) => {
            return await VideoOrchestration.semanticSearchScenes(prompt, videoUuid ? [videoUuid] : undefined);
        }
    },
    Mutation: {
        handleVideoOrchestration: async (
            _: unknown,
            args: { prompt: string; context?: { action: string; uuid: string } }
        ) => {
            const { prompt, context } = args;

            const serviceContext = context
                ? { uuid: context.uuid, action: context.action }
                : undefined;

            return await VideoOrchestration.orchestrate(prompt, serviceContext);
        },
        judgeVideoScenes: async (
            _: unknown,
            args: { prompt: string; scenes: { id: string; [key: string]: unknown }[] }
        ) => {
            return await VideoOrchestration.judgeScenes(args.prompt, args.scenes);
        }
    }
};