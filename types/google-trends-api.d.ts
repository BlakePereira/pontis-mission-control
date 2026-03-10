declare module 'google-trends-api' {
  interface GoogleTrendsOptions {
    keyword?: string | string[];
    startTime?: Date;
    endTime?: Date;
    geo?: string;
    hl?: string;
    timezone?: number;
    category?: number;
    resolution?: string;
  }

  export function interestOverTime(options: GoogleTrendsOptions): Promise<string>;
  export function interestByRegion(options: GoogleTrendsOptions): Promise<string>;
  export function relatedQueries(options: GoogleTrendsOptions): Promise<string>;
  export function relatedTopics(options: GoogleTrendsOptions): Promise<string>;
  
  const googleTrends: {
    interestOverTime: typeof interestOverTime;
    interestByRegion: typeof interestByRegion;
    relatedQueries: typeof relatedQueries;
    relatedTopics: typeof relatedTopics;
  };
  
  export default googleTrends;
}
