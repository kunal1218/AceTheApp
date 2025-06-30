import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "Missing fields" });
  if (password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: "Email exists" });
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashed, myColleges: [], collegeDocs: {} });
  await user.save();
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  // Return full user object except password
  const userObj = user.toObject();
  delete userObj.password;
  res.json({ token, user: userObj });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "Invalid credentials" });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token, user: { name: user.name, email: user.email } });
});

export default router;