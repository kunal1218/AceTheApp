import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import session from "express-session";
import passport from "passport";
import MongoStore from "connect-mongo";

dotenv.config();
const app = express(); // <-- MOVE THIS UP HERE

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN, // moved from hardcoded value
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// lightweight request logger to help debug 404/401s on Vercel
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[TRACE] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms) ` +
      `host=${req.headers.host} ip=${req.ip} ua="${req.headers["user-agent"] || ""}"`
    );
  });
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || "devsecret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

// catch-all for unfound API requests so we can see them in logs
app.use((req, res) => {
  console.warn(`[WARN] 404 on ${req.method} ${req.originalUrl} host=${req.headers.host}`);
  res.status(404).json({ message: "Route not found", path: req.originalUrl });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
