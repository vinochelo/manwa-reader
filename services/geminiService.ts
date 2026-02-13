import { GoogleGenAI, Modality } from "@google/genai";
import { StoryContent, BookDetails, Chapter } from "../types";

const LOCAL_STORAGE_KEY_API = 'user_custom_api_key';

// Internal mutable instance
let aiClient: GoogleGenAI | null = null;

const getEnvApiKey = (): string => {
  // 1. Try Vite standard (import.meta.env)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
      // @ts-ignore
      if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
    }
  } catch (e) {}

  // 2. Try Standard process.env (Webpack, CRA, Next.js, Node)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.API_KEY) return process.env.API_KEY;
    if (process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
    if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
  }

  return '';
};

// Initialize AI Client with the best available key
const initializeAI = () => {
  let key = '';
  
  // 1. Check Local Storage (User override)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_API);
    if (stored) key = stored;
  }

  // 2. Check Env if no custom key
  if (!key) {
    key = getEnvApiKey();
  }

  // 3. Fallback
  if (!key) {
    console.warn("No API Key found in Env or Storage. Calls will fail.");
  }
  
  // Re-create instance
  aiClient = new GoogleGenAI({ apiKey: key || 'missing-key' });
};

// Initial setup
initializeAI();

/**
 * Updates the API Key from the UI and re-initializes the client.
 */
export const setCustomApiKey = (key: string) => {
  if (typeof window !== 'undefined') {
    if (key) {
      localStorage.setItem(LOCAL_STORAGE_KEY_API, key);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_API);
    }
  }
  initializeAI();
};

export const getCustomApiKey = (): string => {
    if (typeof window !== 'undefined') return localStorage.getItem(LOCAL_STORAGE_KEY_API) || '';
    return '';
}

/**
 * Helper to ensure we always use the current instance
 */
const getAI = () => {
  if (!aiClient) initializeAI();
  return aiClient!;
};

// --- Utilities ---

function cleanAndParseJSON(text: string): any {
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(json)?|```$/g, '').trim();
  }
  return JSON.parse(cleanText);
}

// --- API Functions ---

export async function fetchBookDetails(url: string): Promise<BookDetails> {
  const prompt = `
    Act as a Web Scraper.
    Target URL: ${url}

    Task:
    1. Identify the Novel Title.
    2. Determine the TOTAL number of chapters available.
    3. Analyze the URL structure of the chapters.
    
    Return JSON:
    {
      "title": "Novel Title",
      "description": "Brief summary",
      "totalChapters": 100, 
      "urlPattern": "https://novellive.app/book/novel-slug/{number}", 
      "firstChapterNumber": 1
    }
  `;

  // Use Flash for metadata
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  if (!text) throw new Error("No se pudo analizar la novela. Verifica tu API Key o la URL.");

  try {
    const data = JSON.parse(text);
    
    const chapters: Chapter[] = [];
    const total = data.totalChapters || 100; 
    const start = data.firstChapterNumber || 1;
    let pattern = data.urlPattern;

    if (pattern && !pattern.includes('{number}')) {
       if (pattern.endsWith('/')) pattern += '{number}';
       else pattern += '/{number}';
    }

    if (pattern) {
        for (let i = start; i <= total; i++) {
            chapters.push({
                number: i,
                title: `Capítulo ${i}`,
                url: pattern.replace('{number}', i.toString())
            });
        }
    }

    return {
      title: data.title,
      description: data.description,
      totalChaptersFound: total,
      chapters: chapters
    };

  } catch (e) {
    console.error("Analysis Error", e);
    throw new Error("Error al analizar la estructura del libro.");
  }
}

export async function processContent(input: string, mode: 'url' | 'text'): Promise<StoryContent> {
  
  const generatePrompt = (isPro: boolean) => {
    if (mode === 'url') {
      return `
        ROLE: ${isPro ? 'Advanced ' : ''}Web Content Retriever & Translator.
        INPUT URL: ${input}

        OBJECTIVE: Retrieve the *COMPLETE* text of this novel chapter and translate it to Spanish.
        
        INSTRUCTIONS:
        1. **SEARCH**: Use 'googleSearch' to find the full text of the chapter.
           - Query: "Read [Novel Name] [Chapter Number] full text online".
        
        2. **VERIFY**: Ensure the text has an ending (look for "End of chapter", next button text, or closing scene).

        3. **TRANSLATE**:
           - Translate verbatim to Spanish (Español Neutro).
           - Do NOT summarize.

        OUTPUT JSON:
        {
          "title": "Chapter Title",
          "originalText": "Start: [First 200 chars] ... End: [Last 200 chars]",
          "translatedText": "The FULL translated Spanish text..."
        }
      `;
    } else {
      return `
        ROLE: Translator.
        TASK: Translate to Spanish (Neutral).
        INPUT: ${input.substring(0, 45000)}
        
        OUTPUT JSON:
        {
          "title": "Texto Pegado",
          "originalText": "...",
          "translatedText": "..."
        }
      `;
    }
  };

  // 1. Try with Gemini 3 Pro
  try {
    console.log("Attempting extraction with Gemini 3 Pro...");
    const response = await getAI().models.generateContent({
      model: "gemini-3-pro-preview",
      contents: generatePrompt(true),
      config: {
        responseMimeType: "application/json",
        tools: mode === 'url' ? [{ googleSearch: {} }] : undefined,
      },
    });

    if (response.text) {
      const json = cleanAndParseJSON(response.text);
      if (json.translatedText) return normalizeResponse(json, input, mode);
    }
  } catch (e: any) {
    console.warn("Gemini 3 Pro failed or timed out. Falling back to Flash.", e);
    if (e.message?.includes('API key') || e.toString().includes('400')) throw e; // Don't fallback on auth errors
  }

  // 2. Fallback: Gemini 3 Flash
  try {
    console.log("Fallback extraction with Gemini 3 Flash...");
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: generatePrompt(false),
      config: {
        responseMimeType: "application/json",
        tools: mode === 'url' ? [{ googleSearch: {} }] : undefined,
      },
    });

    if (!response.text) throw new Error("Sin respuesta de la IA (Flash).");
    
    const json = cleanAndParseJSON(response.text);
    return normalizeResponse(json, input, mode);

  } catch (e: any) {
    console.error("Final extraction error", e);
    if (e.message?.includes('API key') || e.toString().includes('400')) {
        throw new Error("API Key inválida. Por favor configura tu clave en Ajustes.");
    }
    throw new Error("No se pudo extraer el capítulo. Intente de nuevo o pegue el texto manualmente.");
  }
}

function normalizeResponse(json: any, input: string, mode: string): StoryContent {
  if (!json.translatedText) throw new Error("La respuesta no contiene traducción.");
  return {
    title: json.title || "Capítulo",
    translatedText: json.translatedText,
    originalText: json.originalText || (mode === 'text' ? input.substring(0, 200) : "No disponible"),
  };
}

export async function generateSpeechFromText(text: string): Promise<string> {
  const charLimit = 5000; 
  let safeText = text;
  
  if (text.length > charLimit) {
    safeText = text.substring(0, charLimit) + "...";
  }

  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: safeText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Puck' }, 
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Error generando audio.");

  return base64Audio;
}