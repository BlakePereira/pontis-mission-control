declare module "youtube-transcript" {
  export interface TranscriptItem {
    text: string;
    duration: number;
    offset: number;
    lang?: string;
  }

  export const YoutubeTranscript: {
    fetchTranscript(videoId: string): Promise<TranscriptItem[]>;
  };
}
