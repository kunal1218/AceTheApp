import { getGenAI } from "./client";

type GeminiJsonRepairOptions<T> = {
  model: string;
  systemInstruction: string;
  repairSystemInstruction: string;
  prompt: string;
  repairPrompt: (rawText: string) => string;
  validate: (value: unknown) => value is T;
  temperature?: number;
  maxOutputTokens?: number;
};

export const sanitizeGeminiJSON = (str: string): string => {
  let cleaned = str
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  return cleaned;
};

export const runGeminiJsonWithRepair = async <T>(
  options: GeminiJsonRepairOptions<T>
): Promise<{ result: T | null; repaired: boolean; raw: string }> => {
  const {
    model,
    systemInstruction,
    repairSystemInstruction,
    prompt,
    repairPrompt,
    validate,
    temperature = 0.2,
    maxOutputTokens = 1024
  } = options;

  const genModel = getGenAI().getGenerativeModel({
    model,
    systemInstruction
  });

  const first = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType: "application/json"
    }
  });

  const raw = first.response.text().trim();
  let cleaned = sanitizeGeminiJSON(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = undefined;
  }

  if (parsed && validate(parsed)) {
    return { result: parsed as T, repaired: false, raw };
  }

  const repairModel = getGenAI().getGenerativeModel({
    model,
    systemInstruction: repairSystemInstruction
  });

  const repairResponse = await repairModel.generateContent({
    contents: [{ role: "user", parts: [{ text: repairPrompt(cleaned) }] }],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens,
      responseMimeType: "application/json"
    }
  });

  const repairRaw = repairResponse.response.text().trim();
  cleaned = sanitizeGeminiJSON(repairRaw);
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = undefined;
  }

  if (parsed && validate(parsed)) {
    return { result: parsed as T, repaired: true, raw: repairRaw };
  }

  return { result: null, repaired: true, raw: repairRaw };
};
