import { allColleges } from "../components/CollegeList";
import { getUsaMapClickedChain, saveUsaMapClickedChain } from "../api";

export const START_COLLEGE_ID = "BY"; // UC Berkeley kickoff
export const NEXT_STOP_STORAGE_KEY = "ace_next_stop";
export const NEARBY_DISTANCE = 140;

export const getCollegeById = (id) => allColleges.find((college) => college.id === id);

export const distanceBetween = (a, b) => {
  if (!a || !b) return Infinity;
  return Math.hypot(a.x - b.x, a.y - b.y);
};

export const pickNearbyCollegeId = (fromId, excludeIds = [], radius = NEARBY_DISTANCE) => {
  const origin = getCollegeById(fromId);
  if (!origin) return null;
  const blacklist = new Set([fromId, ...excludeIds]);
  const candidates = allColleges.filter((college) => !blacklist.has(college.id));
  if (!candidates.length) return null;
  const nearby = candidates.filter((college) => distanceBetween(origin, college) <= radius);
  const pool = nearby.length ? nearby : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
};

export const fetchCourseChain = async () => {
  try {
    const chain = await getUsaMapClickedChain();
    if (Array.isArray(chain) && chain.length) {
      return chain;
    }
  } catch (err) {
    console.error("[coursePath] Failed to fetch chain", err);
  }
  const fallback = [START_COLLEGE_ID];
  await saveUsaMapClickedChain(fallback);
  return fallback;
};

export const appendCourseStop = async (stopId) => {
  if (!stopId) return [];
  const chain = await fetchCourseChain();
  if (chain[chain.length - 1] === stopId) return chain;
  const updated = [...chain, stopId];
  await saveUsaMapClickedChain(updated);
  return updated;
};

const VIDEO_LIBRARY = {
  BY: {
    url: "https://www.youtube.com/embed/ubr9BW6g7mg",
    title: "Kickoff at Berkeley",
    description: "Launch your journey with Ace from UC Berkeley—set intentions and define what success will look like.",
  },
  CA: {
    url: "https://www.youtube.com/embed/ubr9BW6g7mg",
    title: "Stanford Systems Sprint",
    description: "Learn how to architect systems thinking inspired by Stanford’s legendary design culture.",
  },
  LA: {
    url: "https://www.youtube.com/embed/ubr9BW6g7mg",
    title: "Los Angeles Creative Lab",
    description: "Channel UCLA’s creative energy to build a standout narrative for your next milestone.",
  },
};

const DEFAULT_VIDEO = {
  url: "https://www.youtube.com/embed/ubr9BW6g7mg",
  title: "Ace Counseling Lesson",
  description: "Stay focused with Ace’s guidance and ship consistent progress toward your goals.",
};

export const getLessonVideo = (collegeId) => {
  const preset = VIDEO_LIBRARY[collegeId];
  if (preset) return preset;
  const college = getCollegeById(collegeId);
  if (!college) return DEFAULT_VIDEO;
  return {
    ...DEFAULT_VIDEO,
    title: `${college.name} Focus Session`,
    description: `Ace translates lessons from ${college.name} into actionable next steps for you.`,
  };
};
