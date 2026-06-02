import { getSourceVideosByIds } from "@/models/source_video.ts";
import { getUnvirtualizedVideoIds, deleteIsobmffByUUID, purgeAssetsDatabase, purgeIsobmffFiles, purgeSourceFiles, indexDirectory } from "@/services/system.ts";
import { uuidRegex } from "@/graphql/resolvers/health.ts";

export const resolver = {
    Query: {
        findUnvirtualizedSourceVideos: async () => {
            // 1. Ask File System: "Which IDs are missing folders?"
            const missingIds = await getUnvirtualizedVideoIds();

            // 2. Ask Database: "Give me the names/metadata for these IDs"
            return await getSourceVideosByIds(missingIds);
        },
        indexDirectory: async (_: unknown, { url }: { url: string }) => {
            return await indexDirectory(url);
        },
    },
    Mutation: {
        deleteIsobmffByUUID: async (
            _parent: unknown,
            { uuid }: { uuid: string }
        ) => {
            if (!uuidRegex.test(uuid)) {
                throw new Error('Invalid UUID format');
            }

            try {
                const result = await deleteIsobmffByUUID(uuid);
                return {
                    success: result.success,
                    message: result.message,
                    uuid
                };
            } catch (error: unknown) {
                console.error(`Error deleting ISOBMFF directory for ${uuid}:`, error);
                throw new Error(error instanceof Error ? error.message : 'Internal server error during deletion');
            }
        },
        purgeAssetsDatabase: async () => {
            try {
                const result = await purgeAssetsDatabase();
                return result;
            } catch (error: unknown) {
                console.error(`Error purging assets database:`, error);
                throw new Error(error instanceof Error ? error.message : 'Internal server error during database purge');
            }
        },
        purgeIsobmffFiles: async () => {
            try {
                const result = await purgeIsobmffFiles();
                return result;
            } catch (error: unknown) {
                console.error(`Error purging ISOBMFF files:`, error);
                throw new Error(error instanceof Error ? error.message : 'Internal server error during file purge');
            }
        },
        purgeSourceFiles: async () => {
            try {
                const result = await purgeSourceFiles();
                return result;
            } catch (error: unknown) {
                console.error(`Error purging Source files:`, error);
                throw new Error(error instanceof Error ? error.message : 'Internal server error during file purge');
            }
        },
    },
};