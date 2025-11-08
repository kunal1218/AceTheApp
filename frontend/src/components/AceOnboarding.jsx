import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./LandingPage.css";
import "./AceOnboarding.css";

export default function AceOnboarding() {
  const location = useLocation();
  const navigate = useNavigate();
  const idea = location.state?.idea || "";

  const script = useMemo(() => ([
    "Hey! I’m Ace — your co-pilot inside this workspace.",
    idea ? `I heard you want to work on “${idea}”. Love it.` : "Tell me what you’re excited about and I’ll map the path.",
    "Give me a moment to transform that into phases, milestones, and daily rituals.",
    "Ready? I’ll drop you back into the dashboard with your first quest queued up."
  ]), [idea]);

  const [step, setStep] = useState(0);
  const [displayedLine, setDisplayedLine] = useState("");

  useEffect(() => {
    const line = script[step];
    setDisplayedLine("");
    let idx = 0;
    const interval = setInterval(() => {
      setDisplayedLine(line.slice(0, idx + 1));
      idx += 1;
      if (idx >= line.length) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [step, script]);

  const handleAdvance = () => {
    if (step < script.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="ace-onboarding">
      <div className="ace-onboarding__panel">
        <div className="ace-avatar">🤖</div>
        <div className="ace-dialog">
          <p>{displayedLine}</p>
        </div>
        <button className="ace-btn" onClick={handleAdvance}>
          {step < script.length - 1 ? "Next" : "Back to dashboard"}
        </button>
      </div>
    </div>
  );
}
