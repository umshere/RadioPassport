
import { Station } from './radio';

export interface StationContext {
  flightLog: string;
  estimatedTransit: string;
  regionalIntel: string;
  musicalVibe: string;
  localFlavor: string;
  recommendation: {
    label: string;
    country: string;
    tag: string;
  };
  colorVibe: string;
  currentProgram: string;
  liveSchedule: string[];
  regionalCoordinates: string;
  deepDive: {
    subject: string;
    bio: string;
    genreOrigins: string;
    moodAnalysis: string;
    links: Array<{
      label: string;
      url: string;
      type: string;
    }>;
  };
}

export interface PassportEntry {
  id: string;
  stationName: string;
  country: string;
  countryCode?: string;
  timestamp: number;
  favicon?: string;
}

export interface AgentAction {
  type: string;
  query?: string;
  country?: string;
  tag?: string;
  limit?: number;
  explanation: string;
}

export interface CurationSegment {
  title: string;
  description: string;
  query: {
    country?: string;
    tag?: string;
    name?: string;
  };
}

export interface CuratedRow {
  title: string;
  description: string;
  stations: Station[];
}
