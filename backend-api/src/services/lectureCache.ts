import crypto from "crypto";

export const STYLE_VERSION = "v1";
export const TIE_IN_VERSION = "v1";

export const normalizeTopic = (topicName: string) =>
  topicName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const hashKey = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const buildGeneralCacheKey = (normalizedTopic: string, level: string) =>
  hashKey(`${normalizedTopic}|${level}|${STYLE_VERSION}`);

export const buildTieInCacheKey = (
  courseId: string,
  topicId: string,
  notesVersion: string
) => hashKey(`${courseId}|${topicId}|${notesVersion}|${TIE_IN_VERSION}`);
