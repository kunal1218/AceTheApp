import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WizardGate.css";

const PLAYER_SIZE = 24;
const WIZARD_SIZE = 30;
const SPEED = 240; // pixels per second
const TRIGGER_DISTANCE = 50;

export default function WizardGate() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [player, setPlayer] = useState({ x: 150, y: 150 });
  const [wizard, setWizard] = useState({ x: 0, y: 0 });
  const heldKeys = useRef(new Set());
  const lastTick = useRef(performance.now());

  // Position wizard near the right edge once container is measured
  useEffect(() => {
    const placeWizard = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setWizard({
        x: rect.width - 120,
        y: rect.height / 2 - WIZARD_SIZE / 2,
      });
    };
    placeWizard();
    window.addEventListener("resize", placeWizard);
    return () => window.removeEventListener("resize", placeWizard);
  }, []);

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  useEffect(() => {
    const onDown = (e) => {
      if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        heldKeys.current.add(e.key);
      }
    };
    const onUp = (e) => {
      heldKeys.current.delete(e.key);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useEffect(() => {
    const tick = (now) => {
      const dt = Math.min((now - lastTick.current) / 1000, 0.05);
      lastTick.current = now;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setPlayer((prev) => {
          let { x, y } = prev;
          const k = heldKeys.current;
          const delta = SPEED * dt;
          if (k.has("w") || k.has("ArrowUp")) y -= delta;
          if (k.has("s") || k.has("ArrowDown")) y += delta;
          if (k.has("a") || k.has("ArrowLeft")) x -= delta;
          if (k.has("d") || k.has("ArrowRight")) x += delta;
          return {
            x: clamp(x, 0, rect.width - PLAYER_SIZE),
            y: clamp(y, 0, rect.height - PLAYER_SIZE),
          };
        });
      }
      requestAnimationFrame(tick);
    };
    lastTick.current = performance.now();
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const distance = Math.hypot(player.x - wizard.x, player.y - wizard.y);

  const handleWizardClick = () => {
    if (distance <= TRIGGER_DISTANCE) {
      navigate("/dashboard/main", { replace: true });
    }
  };

  return (
    <div className="wg-root">
      <div className="wg-arena" ref={containerRef}>
        <div
          className="wg-character"
          style={{ left: player.x, top: player.y, width: PLAYER_SIZE, height: PLAYER_SIZE }}
        >
          <div className="wg-face" />
        </div>
        <button
          className="wg-wizard"
          style={{ left: wizard.x, top: wizard.y, width: WIZARD_SIZE, height: WIZARD_SIZE }}
          onClick={handleWizardClick}
          type="button"
          aria-label="Old wizard"
        >
          🧙‍♂️
        </button>
      </div>
    </div>
  );
}
