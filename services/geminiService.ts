
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Local fallbacks to use when API is rate-limited or fails
const FALLBACK_MESSAGES = [
  "KEEP YOUR EYES ON THE TRACK!",
  "WATCH OUT FOR THE MUD PITS!",
  "TURBO BOOST FOR MAXIMUM SPEED!",
  "GREAT JUMP! KEEP IT UP!",
  "STAY STEADY ON THE LANDINGS!",
  "YOU'RE TEARING UP THE TRACK!",
  "WATCH THAT TEMPERATURE GAUGE!",
  "NES RACING AT ITS FINEST!"
];

let lastCallTime = 0;
const MIN_CALL_INTERVAL = 20000; // 20 seconds minimum between AI calls

export async function getCommentary(stats: { score: number, crashes: number, maxSpeed: number }) {
  const now = Date.now();
  
  // Throttle calls to prevent hitting rate limits
  if (now - lastCallTime < MIN_CALL_INTERVAL) {
    return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
  }

  try {
    lastCallTime = now;
    // Fix: Refactored generateContent to use systemInstruction for the announcer persona and thinkingBudget: 0 for faster response.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate commentary for - Score: ${stats.score}, Crashes: ${stats.crashes}, Top Speed: ${stats.maxSpeed.toFixed(1)}.`,
      config: {
        systemInstruction: "You are a retro NES game announcer for Excitebike. Provide a single-sentence, enthusiastic, and funny commentary about the player's performance.",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text?.trim() || "GREAT RACING!";
  } catch (err: any) {
    console.warn("Gemini API encountered an issue (likely quota). Falling back to local messages.", err?.message);
    
    // If it's a 429, we should be even more conservative
    if (err?.message?.includes("429") || err?.status === 429) {
      lastCallTime = now + 40000; // Penalize next call by an extra 40s
    }
    
    return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
  }
}
