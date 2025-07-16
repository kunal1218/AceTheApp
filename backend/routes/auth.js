import "dotenv/config";

import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
const router = express.Router();

// Google OAuth setup
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if this is a signup attempt
    const isSignup = profile._json.signup === true || (profile._json.signup === "true");
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      // Only create account if signup=true
      if (isSignup) {
        user = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          password: "", // No password for Google accounts
          myColleges: [],
          collegeDocs: {}
        });
        await user.save();
        return done(null, user);
      } else {
        // User does not exist, do not create a new account
        console.error("[GoogleStrategy] No user found for email:", profile.emails[0].value);
        return done(null, false, { message: "No account exists for this email. Please sign up first." });
      }
    }
    // User exists, allow login
    return done(null, user);
  } catch (err) {
    console.error("[GoogleStrategy] Error:", err);
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Registration route: prevent duplicate emails
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

// Google OAuth routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: true
  }),
  (req, res) => {
    // Redirect to frontend after successful login
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET);
    res.redirect(`${process.env.FRONTEND_ORIGIN}/profile?token=${token}`);
  },
  (err, req, res, next) => {
    console.error("[Google OAuth callback] Error:", err);
    // If the error is from our custom GoogleStrategy logic, show a clear message
    if (err && err.message === "No account exists for this email. Please sign up first.") {
      return res.status(403).send("No account exists for this email. Please sign up first.");
    }
    res.status(500).send("OAuth error: " + (err && err.message ? err.message : "Unknown error"));
  }
);

router.get("/logout", (req, res) => {
  req.logout(() => {
    // Use an absolute backend URL for logout redirect to avoid blank page if user logs out from a different origin
    res.redirect(`${process.env.FRONTEND_ORIGIN}/login`);
  });
});

export default router;