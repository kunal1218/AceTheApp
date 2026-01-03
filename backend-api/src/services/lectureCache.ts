import crypto from "crypto";

export const STYLE_VERSION = "v1";
export const TIE_IN_VERSION = "v1";

type TopicContextSource = {
  title?: string | null;
  description?: string | null;
  type?: string | null;
};

export const normalizeTopic = (topicName: string) =>
  topicName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getTopicContextFromSyllabusItem = (item: TopicContextSource) => {
  const parts = [
    item.title?.trim(),
    item.description?.trim(),
    item.type?.trim()
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : "untitled topic";
};

export const hashKey = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const buildGeneralCacheKey = (normalizedTopic: string, level: string) =>
  hashKey(`${normalizedTopic}|${level}|${STYLE_VERSION}`);

export const buildTieInCacheKey = (
  courseId: string,
  topicContextHash: string
) => hashKey(`${courseId}|${topicContextHash}|${TIE_IN_VERSION}`);
