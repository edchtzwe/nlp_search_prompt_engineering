export type VideoToolName = 'clip_video' | 'composite_videos' | 'remix_mixture' | 'playback_video';

export interface ClipVideoToolArgs {
    sourceVideoId: string;
    startTime: number;
    endTime: number;
    reasoning: string;
}

export interface CompositeVideosToolArgs {
    sourceVideoIds: string[];
    reasoning: string;
}

export interface RemixMixtureClip {
    sourceVideoId: string;
    startTime: number;
    endTime: number;
}

export interface RemixMixtureToolArgs {
    clips: RemixMixtureClip[];
    reasoning: string;
}

export interface PlaybackVideoToolArgs {
    sourceVideoId: string;
    reasoning: string;
}

export type VideoToolArgsMap = {
    clip_video: ClipVideoToolArgs;
    composite_videos: CompositeVideosToolArgs;
    remix_mixture: RemixMixtureToolArgs;
    playback_video: PlaybackVideoToolArgs;
};

export interface ToolCallDecision<TName extends VideoToolName = VideoToolName> {
    toolName: TName;
    parameters: VideoToolArgsMap[TName];
    explanation: string;
}

export interface ToolFunctionDeclaration {
    name: VideoToolName;
    description: string;
    parameters: Record<string, unknown>;
}
