export interface GradingBreakdownItem {
  component: string;
  weight_percent: number | null;
}

export interface Policies {
  late_work: string | null;
  attendance: string | null;
  academic_integrity: string | null;
}

export interface ScheduleEntry {
  date: string | null; // expected YYYY-MM-DD if available
  title: string;
  type: "lesson" | "assignment" | "exam" | "other";
  details: string | null;
}

export interface Syllabus {
  course_code: string | null;
  course_title: string | null;
  term: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  meeting_times: string | null;
  location: string | null;
  office_hours: string | null;
  description: string | null;
  grading_breakdown: GradingBreakdownItem[];
  major_assignments: string[];
  policies: Policies;
  schedule_entries: ScheduleEntry[];
}
