export type WhiteboardOp =
  | { op: "rect"; x: number; y: number; w: number; h: number; label?: string }
  | { op: "circle"; x: number; y: number; r: number; label?: string }
  | { op: "arrow"; from: [number, number]; to: [number, number]; label?: string }
  | { op: "text"; x: number; y: number; text: string }
  | { op: "erase"; target?: "all" | string };

export type LectureChunk = {
  chunkTitle: string;
  narration: string;
  boardOps?: WhiteboardOp[];
};

export type WhiteboardFigure = {
  line: number;
  use_cached: boolean;
  figure_id: string;
  tags: string[];
  concept_context: string;
  svg: string | null;
};

export type WhiteboardPlan = {
  whiteboard: WhiteboardFigure[];
};

export type LecturePackage = {
  // topicId is the SyllabusItem.id for the course.
  topicId: string;
  level: "intro" | "exam" | "deep";
  chunks: LectureChunk[];
  tieIns?: string[];
  topQuestions?: string[];
  confusionMode: {
    summary: string;
    boardOps?: WhiteboardOp[];
  };
  whiteboard?: WhiteboardPlan;
};

export type LectureLevel = LecturePackage["level"];

export type GeneralLectureContent = {
  chunks: Array<Pick<LectureChunk, "chunkTitle" | "narration" | "boardOps">>;
  topQuestions?: string[];
  confusionMode: LecturePackage["confusionMode"];
  diagnostics?: {
    call1WordCount?: number;
    call2WordCount?: number;
    convertPass?: "ok" | "repaired" | "stub_fallback";
    call1AnswerText?: string;
  };
  source?: "gemini" | "stub" | "stub_fallback";
};

export type LectureQuestionAnswer = {
  answer: string;
  boardOps?: WhiteboardOp[];
};
