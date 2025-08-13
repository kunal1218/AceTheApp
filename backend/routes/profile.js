import express from "express";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import OpenAI from "openai";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({
    name: user.name,
    email: user.email,
    password: user.password, // hashed, will be masked in frontend
    myColleges: user.myColleges,
    collegeDocs: Object.fromEntries(user.collegeDocs || []),
    assignmentAnswers: user.assignmentAnswers,
    surveyAnswers: user.surveyAnswers,
    usaMapClickedChain: user.usaMapClickedChain,
    collegeProgress: user.collegeProgress
  });
});

router.get("/colleges", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.myColleges || []);
});

router.post("/colleges", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user.myColleges.includes(req.body.id)) user.myColleges.push(req.body.id);
  await user.save();
  res.json(user.myColleges);
});

router.delete("/colleges/:id", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  user.myColleges = user.myColleges.filter(cid => cid !== req.params.id);
  await user.save();
  res.json(user.myColleges);
});

router.post("/college-doc", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  user.collegeDocs.set(req.body.collegeId, req.body.docUrl);
  await user.save();
  res.json({ success: true });
});

router.get("/college-docs", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(Object.fromEntries(user.collegeDocs));
});

// Save assignment answers
router.post("/assignment-answers", auth, async (req, res) => {
  await User.findByIdAndUpdate(
    req.user.id,
    { assignmentAnswers: req.body.answers },
    { new: true }
  );
  res.json({ success: true });
});

// Get assignment answers
router.get("/assignment-answers", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  // Always return array of length 4
  let answers = user.assignmentAnswers || [];
  if (!Array.isArray(answers)) answers = [];
  if (answers.length < 4) answers = [...answers, ...Array(4 - answers.length).fill("")];
  if (answers.length > 4) answers = answers.slice(0, 4);
  res.json(answers);
});

// Save clicked chain
router.post("/usa-map-chain", auth, async (req, res) => {
  await User.findByIdAndUpdate(
    req.user.id,
    { usaMapClickedChain: req.body.chain },
    { new: true }
  );
  res.json({ success: true });
});

// Get clicked chain
router.get("/usa-map-chain", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.usaMapClickedChain || []);
});

// Save or update progress for a college
router.post("/progress", auth, async (req, res) => {
  const { collegeId, progress } = req.body;
  // Use $set for nested field update
  await User.findByIdAndUpdate(
    req.user.id,
    { $set: { ["collegeProgress." + collegeId]: progress } },
    { new: true }
  );
  res.json({ success: true });
});

// Get all college progress for the user
router.get("/progress", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.collegeProgress || {});
});

// Save survey answers
router.post("/survey-answers", auth, async (req, res) => {
  await User.findByIdAndUpdate(
    req.user.id,
    { surveyAnswers: req.body.answers },
    { new: true }
  );
  res.json({ success: true });
});

// Get survey answers
router.get("/survey-answers", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  // Always return array of length 10
  let answers = user.surveyAnswers || [];
  if (!Array.isArray(answers)) answers = [];
  if (answers.length < 10) answers = [...answers, ...Array(10 - answers.length).fill(null)];
  if (answers.length > 10) answers = answers.slice(0, 10);
  res.json(answers);
});

// Example dictionary for tokenization (expand as needed)
const DICT = { "the": "1", "and": "2", "you": "@", "to": "+", "please": "!", "for": "#", "of": "$", "a": "%", "in": "^", "is": "*", "on": "~" };

function encodeDictionary(dict) {
  return Object.entries(dict).map(([k, v]) => `${k}=${v}`).join(", ");
}

function decodeWithDictionary(text, dict) {
  const reverseDict = Object.fromEntries(Object.entries(dict).map(([k, v]) => [v, k]));
  // Replace tokens with words (token boundaries)
  return text.replace(/\b([@!+1-9a-zA-Z#%$^*~])\b/g, (m) => reverseDict[m] || m);
}

router.post("/generate-subgoals", auth, async (req, res) => {
  const { goal } = req.body;
  if (!goal) {
    console.error("[ERROR] Missing goal in request body");
    return res.status(400).json({ error: "Missing goal" });
  }

  // Build dictionary string for prompt
  const dictString = encodeDictionary(DICT);
  // Optimized prompt for dictionary tokenization and minified JSON
  const prompt = `Use this dictionary for all responses: ${dictString}\nCompress all output using the dictionary, no explanations, no whitespace, minified JSON only.\nUser goal: \"${goal}\". Break down the goal into three phases (Research, Ideation, Development), each with up to 5 milestones, and for each milestone, up to 3 easy, medium, and hard tasks. Respond ONLY with minified JSON using the dictionary.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.7,
    });
    const text = completion.choices[0].message.content;
    console.log("[GPT RAW RESPONSE]", text); // Always log raw response
    let result;
    try {
      result = JSON.parse(decodeWithDictionary(text, DICT));
    } catch (e) {
      console.error("[ERROR] JSON.parse failed", e);
      // fallback: try to extract JSON from text
      const match = text.match(/{.*}/s);
      if (match) {
        try {
          result = JSON.parse(decodeWithDictionary(match[0], DICT));
        } catch (e2) {
          console.error("[ERROR] Fallback JSON.parse failed", e2);
          return res.status(500).json({ error: "Could not parse GPT response as JSON", raw: text });
        }
      } else {
        console.error("[ERROR] No JSON object found in GPT response");
        return res.status(500).json({ error: "Could not parse GPT response as JSON", raw: text });
      }
    }
    res.json(result);
  } catch (err) {
    console.error("[ERROR] OpenAI API or other failure", err);
    res.status(500).json({ error: err.message });
  }
});

// Step 1: User submits goal, get 10 open-ended questions
router.post("/generate-questions", auth, async (req, res) => {
  const { goal } = req.body;
  if (!goal) {
    return res.status(400).json({ error: "Missing goal" });
  }
  const dictString = encodeDictionary(DICT);
  const prompt = `Use this dictionary for all responses: ${dictString}\nCompress all output using the dictionary, no explanations, no whitespace, minified JSON only.\nGiven the user's goal: \"${goal}\", generate 10 open-ended, skill-assessment questions to gauge their current ability and mindset. Respond ONLY with a minified JSON array of questions using the dictionary.`;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.7,
    });
    const text = completion.choices[0].message.content;
    let questions;
    try {
      questions = JSON.parse(decodeWithDictionary(text, DICT));
    } catch (e) {
      const match = text.match(/\[.*\]/s);
      if (match) {
        questions = JSON.parse(decodeWithDictionary(match[0], DICT));
      } else {
        return res.status(500).json({ error: "Could not parse GPT response as JSON", raw: text });
      }
    }
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: User submits answers, get personalized plan
router.post("/generate-plan", auth, async (req, res) => {
  const { goal, answers } = req.body;
  if (!goal || !answers || !Array.isArray(answers) || answers.length !== 10) {
    return res.status(400).json({ error: "Missing goal or answers (must be array of 10)" });
  }
  const dictString = encodeDictionary(DICT);
  const prompt = `Use this dictionary for all responses: ${dictString}\nCompress all output using the dictionary, no explanations, no whitespace, minified JSON only.\nGiven the user's goal: \"${goal}\" and their answers to 10 skill-assessment questions: ${JSON.stringify(answers)}\nBreak down the goal into three phases (Research, Ideation, Development), each with up to 5 milestones, and for each milestone, up to 3 easy, medium, and hard tasks. Respond ONLY with minified JSON using the dictionary in this format: {goal, phases:[{name, milestones:[{name, tasks:{easy:[],medium:[],hard:[]}}]}]}`;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1800,
      temperature: 0.7,
    });
    const text = completion.choices[0].message.content;
    let plan;
    try {
      plan = JSON.parse(decodeWithDictionary(text, DICT));
    } catch (e) {
      const match = text.match(/{.*}/s);
      if (match) {
        plan = JSON.parse(decodeWithDictionary(match[0], DICT));
      } else {
        return res.status(500).json({ error: "Could not parse GPT response as JSON", raw: text });
      }
    }
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;