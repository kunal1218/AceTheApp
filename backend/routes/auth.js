import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
const router = express.Router();

router.post("/register", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      throw new Error("Missing fields");
    if (password.length < 6)
      throw new Error("Password must be at least 6 characters");
    const existing = await User.findOne({ email }).session(session);
    if (existing) throw new Error("Email exists");
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed, myColleges: [], collegeDocs: {} });
    await user.save({ session });
    // If you have other related collections to update, do it here using the same session
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    // Return full user object except password
    const userObj = user.toObject();
    delete userObj.password;
    await session.commitTransaction();
    session.endSession();
    res.json({ token, user: userObj });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message || "Registration failed" });
  }
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