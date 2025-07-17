import express from "express";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
const router = express.Router();

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

export default router;