export type WhiteboardOp =
  | { op: "rect"; x: number; y: number; w: number; h: number; label?: string }
  | { op: "circle"; x: number; y: number; r: number; label?: string }
  | { op: "arrow"; from: [number, number]; to: [number, number]; label?: string }
  | { op: "text"; x: number; y: number; text: string }
  | { op: "erase"; target?: "all" | string };

export type LectureChunk = {
  generalText: string;
  tieInText?: string;
  boardOps?: WhiteboardOp[];
};

export type LecturePackage = {
  // topicId is the SyllabusItem.id for the course.
  topicId: string;
  level: "intro" | "exam" | "deep";
  chunks: LectureChunk[];
  topQuestions: string[];
  confusionMode: {
    summary: string;
    boardOps?: WhiteboardOp[];
  };
};

export type LectureLevel = LecturePackage["level"];

export type GeneralLectureContent = {
  chunks: Array<Pick<LectureChunk, "generalText" | "boardOps">>;
  topQuestions: string[];
  confusionMode: LecturePackage["confusionMode"];
};

export type LectureQuestionAnswer = {
  answer: string;
  boardOps?: WhiteboardOp[];
};
