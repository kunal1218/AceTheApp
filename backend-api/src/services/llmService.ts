import type {
  GeneralLectureContent,
  LectureLevel,
  LectureQuestionAnswer,
  WhiteboardOp
} from "../types/lecture";

type GenerateLectureInput = {
  topicName: string;
  level: LectureLevel;
  styleVersion: string;
};

type GenerateTieInInput = {
  courseName: string;
  topicName: string;
  topicOrdering: string;
  chunkCount: number;
  tieInVersion: string;
};

type QuestionInput = {
  courseName: string;
  topicName: string;
  question: string;
  generalChunks: GeneralLectureContent["chunks"];
  tieIns: string[];
};

const safeOps: WhiteboardOp[] = [
  { op: "rect", x: 24, y: 20, w: 120, h: 50, label: "idea" },
  { op: "arrow", from: [144, 45], to: [200, 45], label: "link" }
];

export const llmService = {
  async generateLecture(input: GenerateLectureInput): Promise<GeneralLectureContent> {
    // TODO: Replace with real LLM call. Keep this output deterministic for caching.
    const { topicName, level, styleVersion } = input;
    return {
      chunks: [
        {
          generalText: `Intro to ${topicName}: start with the core intuition before formulas.`,
          boardOps: safeOps
        },
        {
          generalText: `For ${level} depth (${styleVersion}), focus on why the concept matters.`,
          boardOps: [{ op: "text", x: 22, y: 90, text: "key intuition" }]
        }
      ],
      topQuestions: [
        `What is the simplest way to think about ${topicName}?`,
        `Where does ${topicName} show up most often?`
      ],
      confusionMode: {
        summary: `${topicName} is about a single core idea—focus on that first.`,
        boardOps: [{ op: "text", x: 18, y: 20, text: "one core idea" }]
      }
    };
  },

  async generateTieIns(input: GenerateTieInInput): Promise<string[]> {
    // TODO: Replace with real LLM call for short, course-specific tie-ins.
    const { courseName, topicName, topicOrdering, chunkCount } = input;
    return Array.from({ length: chunkCount }, () =>
      `${topicName} connects to ${courseName} (${topicOrdering}).`
    );
  },

  async answerQuestion(input: QuestionInput): Promise<LectureQuestionAnswer> {
    // TODO: Replace with real LLM call for compact Q&A.
    const { question, topicName } = input;
    return {
      answer: `Short answer on ${topicName}: ${question.trim().slice(0, 120)}.`,
      boardOps: [{ op: "text", x: 16, y: 20, text: "short answer" }]
    };
  }
};
