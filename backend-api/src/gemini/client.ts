import { GoogleGenerativeAI } from "@google/generative-ai";

let cachedGenAI: GoogleGenerativeAI | null = null;

export const getGenAI = (): GoogleGenerativeAI => {
  if (cachedGenAI) return cachedGenAI;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY environment variable.");
  }
  cachedGenAI = new GoogleGenerativeAI(apiKey);
  return cachedGenAI;
};
