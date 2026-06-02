import { getVideoMixturesCatalog, renameVideoMixture } from "@/models/video_mixtures.ts";
import { Seamstress } from "@/services/seamstress.ts";

type SeamstressClipInput = {
    video_id: string;
    startTime: number;
    endTime: number;
};

export const resolvers = {
    Query: {
        getVideoMixturesCatalog: async () => {
            return await getVideoMixturesCatalog();
        }
    },
    Mutation: {
        createSeamstress: async (_: unknown, { clips }: { clips: SeamstressClipInput[] }) => {
            try {
                const result = await Seamstress.createSeamstress(clips);

                return {
                    success: true,
                    uuid: result.uuid,
                    manifestUrl: result.manifestUrl,
                    totalDuration: result.totalDuration,
                    manifestPath: result.manifestPath,
                };
            } catch (e: unknown) {
                console.error("[Seamstress] Error:", e);
                return {
                    success: false,
                    uuid: "",
                    manifestUrl: "",
                    totalDuration: 0,
                    manifestPath: "",
                    message: e instanceof Error ? e.message : "Unknown error",
                };
            }
        },
        renameVideoMixture: async (_: unknown, { mixtureId, name }: { mixtureId: string, name: string }) => {
            const result = await renameVideoMixture(mixtureId, name);
            return {
                success: !!result,
                mixtureId: result.videoMixtureUuid,
                name: result.name
            };

        }
    },
};