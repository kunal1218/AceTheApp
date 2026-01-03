import type { LecturePackage } from "../types/lecture";

export const EXAMPLE_LECTURE_PACKAGE: LecturePackage = {
  topicId: "topic-derivatives",
  level: "intro",
  chunks: [
    {
      generalText: "A derivative captures how fast a quantity changes at a specific moment.",
      tieInText: "In your Calculus I sequence, this shows up when you interpret slope.",
      boardOps: [
        { op: "rect", x: 20, y: 20, w: 120, h: 60, label: "function" },
        { op: "arrow", from: [140, 50], to: [200, 50], label: "change" }
      ]
    },
    {
      generalText: "Think of it as the speedometer reading for a curve.",
      tieInText: "You will use this when discussing motion problems in week 2.",
      boardOps: [{ op: "circle", x: 60, y: 110, r: 18, label: "point" }]
    }
  ],
  topQuestions: [
    "How is a derivative different from average rate of change?",
    "Why do we care about instantaneous change?"
  ],
  confusionMode: {
    summary: "A derivative tells you how fast something changes right now.",
    boardOps: [{ op: "text", x: 16, y: 20, text: "instant change" }]
  }
};
