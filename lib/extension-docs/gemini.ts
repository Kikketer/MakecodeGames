/**
 * Minimal Gemini REST API client.
 * Uses the generativelanguage.googleapis.com endpoint directly
 * so we don't need to add a @google/genai dependency.
 *
 * The API key is read from `GEMINI_KEY` (matching the .env convention
 * in this repo) or `GEMINI_API_KEY` as a fallback.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Default model — latest flash model with 65K output token limit and thinking. */
export const DEFAULT_MODEL = "gemini-flash-latest";

export interface GeminiPart {
  text: string;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiGenerateConfig {
  temperature?: number;
  maxOutputTokens?: number;
  thinkingConfig?: { thinkingBudget?: number };
  /** JSON schema for structured output. */
  responseMimeType?: string;
  responseSchema?: object;
}

export interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: GeminiContent;
  generationConfig?: GeminiGenerateConfig;
}

export interface GeminiResponse {
  candidates: {
    content: GeminiContent;
    finishReason: string;
    index: number;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

function getApiKey(): string {
  const key = process.env.GEMINI_KEY ?? process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_KEY (or GEMINI_API_KEY) environment variable is required");
  return key;
}

/**
 * Call Gemini's generateContent endpoint.
 * Returns the full response including usage metadata.
 */
export async function generateContent(
  request: GeminiRequest,
  options: { model?: string; maxRetries?: number } = {},
): Promise<GeminiResponse> {
  const model = options.model ?? DEFAULT_MODEL;
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const maxRetries = options.maxRetries ?? 3;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Retry on rate limits (429) and server errors (5xx)
        if (response.status === 429 || response.status >= 500) {
          const delay = Math.min(2000 * (attempt + 1), 10000);
          console.warn(`Gemini API ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as GeminiResponse;
      if (!data.candidates?.length) {
        throw new Error("Gemini returned no candidates");
      }
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Don't retry on non-retryable errors
      if (error instanceof Error && !error.message.includes("429") && !error.message.includes("5")) {
        throw error;
      }
      if (attempt < maxRetries - 1) {
        const delay = Math.min(2000 * (attempt + 1), 10000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error("Gemini API failed after retries");
}

/** Extract the text from the first candidate in a Gemini response. */
export function extractText(response: GeminiResponse): string {
  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts?.length) {
    throw new Error("Gemini response has no content parts");
  }
  return candidate.content.parts.map((p) => p.text).join("");
}

/**
 * Call Gemini and parse the response as JSON.
 * Uses responseMimeType: "application/json" for structured output.
 */
export async function generateJson<T>(
  request: GeminiRequest,
  options: { model?: string; maxRetries?: number; responseSchema?: object } = {},
): Promise<T> {
  const response = await generateContent(
    {
      ...request,
      generationConfig: {
        ...request.generationConfig,
        responseMimeType: "application/json",
        responseSchema: options.responseSchema,
        temperature: request.generationConfig?.temperature ?? 0.8,
        maxOutputTokens: request.generationConfig?.maxOutputTokens ?? 65536,
      },
    },
    { model: options.model, maxRetries: options.maxRetries },
  );

  const text = extractText(response);
  try {
    return JSON.parse(text) as T;
  } catch {
    // If the JSON has markdown code fences, strip them
    const cleaned = text.replace(/^```(?:json)?\s*\n?|\n?```\s*$/g, "").trim();
    return JSON.parse(cleaned) as T;
  }
}
