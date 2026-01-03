import type { LecturePackage } from "../types/lecture";

export const EXAMPLE_LECTURE_PACKAGE: LecturePackage = {
  topicId: "topic-derivatives",
  level: "intro",
  chunks: [
    {
      chunkTitle: "Worked Example: Instantaneous Change",
      narration: "A derivative captures how fast a quantity changes at a specific moment.",
      boardOps: [
        { op: "rect", x: 20, y: 20, w: 120, h: 60, label: "function" },
        { op: "arrow", from: [140, 50], to: [200, 50], label: "change" }
      ]
    },
    {
      chunkTitle: "Speedometer Intuition",
      narration: "Think of it as the speedometer reading for a curve."
    }
  ],
  confusionMode: {
    summary: "A derivative tells you how fast something changes right now.",
    boardOps: [{ op: "text", x: 16, y: 20, text: "instant change" }]
  }
};
