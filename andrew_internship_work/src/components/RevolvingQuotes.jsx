import React, { useState, useEffect } from "react";
import "./RevolvingQuotes.css";

export default function RevolvingQuotes({userName}) {
  const QUOTES = [
    `Welcome, ${userName || "Student"}`,
    "The journey of a thousand miles begins with a single step.",
    "Education is the passport to the future.",
    "Explore, dream, discover.",
    "Success is not the key to happiness. Happiness is the key to success."
  ];

  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const fadeOut = setTimeout(() => setFade(false), 9400);
    const next = setTimeout(() => {
      setIndex((i) => (i + 1) % QUOTES.length);
      setFade(true);
    }, 10000);
    return () => {
      clearTimeout(fadeOut);
      clearTimeout(next);
    };
  }, [index]);

  return (
    <div className="revolving-quote">
      <span
        style={{
          opacity: fade ? 1 : 0,
          transition: "opacity 0.3s",
          display: "inline-block",
        }}
      >
        {QUOTES[index]}
      </span>
    </div>
  );
}