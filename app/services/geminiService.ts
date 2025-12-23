
import { GoogleGenAI, Type, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { Station } from "~/types/radio";
import { AgentAction, StationContext, CurationSegment } from "~/types/world";

// Initialize with environment variable - in Remix this is usually accessed via process.env server-side
// or explicit env passing. For now assuming process.env is available or we might need a loader.
// Note: In client-side logic, we shouldn't expose the key directly. 
// However, the original implementation did this, so we will port it as is but mark for future improvement.
// Ideally, this should be a resource route in Remix to hide the key.
const getApiKey = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) {
    return process.env.VITE_GEMINI_API_KEY;
  }
  return "";
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const DEFAULT_SEGMENTS: CurationSegment[] = [
  { title: "Global Top 40", description: "The most listened frequencies worldwide.", query: { tag: "pop" } },
  { title: "Jazz Explorations", description: "Smooth rhythms from around the globe.", query: { tag: "jazz" } },
  { title: "Electronic Pulse", description: "Synthesized sounds from modern hubs.", query: { tag: "electronic" } },
  { title: "Classical Heritage", description: "Timeless compositions across borders.", query: { tag: "classical" } }
];

const contextCache: Record<string, StationContext> = {};

// Helper for calling Gemini with retry logic
async function callAiWithRetry(params: GenerateContentParameters, retries = 3): Promise<GenerateContentResponse> {
  if (!ai) throw new Error("AI client not initialized (missing API key)");
  
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || "";
      const isTransient = 
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') || 
        errorMsg.includes('500') || 
        errorMsg.includes('503') || 
        errorMsg.includes('504') ||
        errorMsg.includes('UNKNOWN');

      if (isTransient && i < retries) {
        const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Gemini AI transient error (Attempt ${i + 1}/${retries + 1}). Retrying...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("Failed after retries");
}

export const geminiService = {
  processPrompt: async (prompt: string): Promise<AgentAction & { language?: string }> => {
    // If no key, return mock
    if (!apiKey) {
      console.warn("No Gemini API Key found. Returning mock response.");
      return { type: 'search', query: prompt, explanation: "Simulating search (No API Key)" };
    }

    try {
      const response = await callAiWithRetry({
        model: "gemini-2.0-flash-lite-preview-02-05", // Updated model
        contents: prompt,
        config: {
          systemInstruction: `You are the RadioPassport AI Agent. Translate human requests into search parameters.
          Return JSON with: type ('search'), query, country, tag, language, limit, and explanation.
          Example: "Jazz in Paris" -> { type: "search", country: "France", tag: "jazz", explanation: "Setting course for French Jazz frequencies." }`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              query: { type: Type.STRING, nullable: true },
              country: { type: Type.STRING, nullable: true },
              tag: { type: Type.STRING, nullable: true },
              language: { type: Type.STRING, nullable: true },
              limit: { type: Type.NUMBER },
              explanation: { type: Type.STRING }
            },
            required: ["type", "explanation"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI search response", e);
      return { type: 'search', query: prompt, explanation: "Broad-band frequency scan initiated." };
    }
  },

  getStationContext: async (station: Station, fromCountry?: string): Promise<StationContext> => {
     // If no key, return mock
     if (!apiKey) {
        return createFallbackContext(station);
     }

    const cacheKey = `${station.uuid}_${fromCountry || 'base'}`;
    if (contextCache[cacheKey]) return contextCache[cacheKey];

    const promptText = `NARRATE THE FLIGHT: We are flying from ${fromCountry || 'Base Station'} to ${station.country} to listen to "${station.name}". 
    Station Data: Tags: ${station.tags}, State: ${station.state || 'N/A'}.`;

    try {
      const response = await callAiWithRetry({
        model: "gemini-2.0-flash-lite-preview-02-05",
        contents: promptText,
        config: {
          systemInstruction: `You are the RadioPassport Captain. You provide sonic travel intelligence.
          Return JSON following the specified schema.
          - flightLog: Atmospheric narrative of the transition.
          - estimatedTransit: Fictional stats.
          - deepDive: Subject (iconic artist/genre), bio, origins, mood, and relevant links.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              flightLog: { type: Type.STRING },
              estimatedTransit: { type: Type.STRING },
              regionalIntel: { type: Type.STRING },
              musicalVibe: { type: Type.STRING },
              localFlavor: { type: Type.STRING },
              recommendation: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  country: { type: Type.STRING },
                  tag: { type: Type.STRING }
                },
                required: ["label", "country", "tag"]
              },
              colorVibe: { type: Type.STRING },
              currentProgram: { type: Type.STRING },
              liveSchedule: { type: Type.ARRAY, items: { type: Type.STRING } },
              regionalCoordinates: { type: Type.STRING },
              deepDive: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  bio: { type: Type.STRING },
                  genreOrigins: { type: Type.STRING },
                  moodAnalysis: { type: Type.STRING },
                  links: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        url: { type: Type.STRING },
                        type: { type: Type.STRING }
                      },
                      required: ["label", "url", "type"]
                    }
                  }
                },
                required: ["subject", "bio", "genreOrigins", "moodAnalysis", "links"]
              }
            },
            required: ["flightLog", "estimatedTransit", "regionalIntel", "musicalVibe", "localFlavor", "recommendation", "colorVibe", "currentProgram", "liveSchedule", "regionalCoordinates", "deepDive"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      const context = JSON.parse(text);
      contextCache[cacheKey] = context;
      return context;
    } catch (e) {
      console.error("Failed to parse AI context response", e);
      return createFallbackContext(station);
    }
  },

  generateCurationSegments: async (): Promise<CurationSegment[]> => {
    if (!apiKey) return DEFAULT_SEGMENTS;
    try {
      const response = await callAiWithRetry({
        model: "gemini-2.0-flash-lite-preview-02-05",
        contents: "Generate 4 creative 'Sonic Playlists' for a global radio app. Return a JSON array of objects with title, description, and query (country/tag).",
        config: {
          systemInstruction: "Generate 4 creative 'Sonic Playlists' for a radio explorer. Return ONLY a JSON array of CurationSegment objects.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                query: {
                  type: Type.OBJECT,
                  properties: {
                    country: { type: Type.STRING, nullable: true },
                    tag: { type: Type.STRING, nullable: true },
                    name: { type: Type.STRING, nullable: true }
                  }
                }
              },
              required: ["title", "description", "query"]
            }
          }
        }
      });
      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : DEFAULT_SEGMENTS;
    } catch (e) {
      console.warn("Using default curation segments due to AI failure", e);
      return DEFAULT_SEGMENTS;
    }
  }
};

function createFallbackContext(station: Station): StationContext {
    return {
        flightLog: `Direct transit to ${station.country} frequencies secured.`,
        estimatedTransit: "Sync Complete",
        regionalIntel: "Broadcasting from the heart of the region.",
        musicalVibe: "Local frequencies and global hits.",
        localFlavor: "Explore the local historic districts.",
        recommendation: { label: "United Kingdom (Pop)", country: "United Kingdom", tag: "pop" },
        colorVibe: "yellow-500",
        currentProgram: "World Radio Hour",
        liveSchedule: ["Regional News", "Top Hits", "Cultural Spotlight"],
        regionalCoordinates: "City Center Terminal",
        deepDive: {
          subject: "Global Rhythms",
          bio: "A mix of contemporary and traditional sounds from the region.",
          genreOrigins: "Roots in local folk evolved through modern production.",
          moodAnalysis: "Energetic and rhythmically complex.",
          links: []
        }
      };
}
