import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WizardGate.css";
import idleSprite from "../assets/characters/mainChar/IDLE.png";
import walkSprite from "../assets/characters/mainChar/WALK.png";

const SPRITE_FRAME_WIDTH = 96;
const SPRITE_FRAME_HEIGHT = 84;
const SPRITE_SCALE = 0.5;
const PLAYER_WIDTH = SPRITE_FRAME_WIDTH * SPRITE_SCALE;
const PLAYER_HEIGHT = SPRITE_FRAME_HEIGHT * SPRITE_SCALE;
const WIZARD_SIZE = 30;
const SPEED = 240; // pixels per second
const TRIGGER_DISTANCE = 50;
const SPRITES = {
  idle: { src: idleSprite, frames: 7, fps: 6 },
  walk: { src: walkSprite, frames: 8, fps: 10 },
};

export default function WizardGate() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [player, setPlayer] = useState({ x: 150, y: 150 });
  const [wizard, setWizard] = useState({ x: 0, y: 0 });
  const heldKeys = useRef(new Set());
  const lastTick = useRef(performance.now());
  const facingRef = useRef("right");
  const animationRef = useRef({
    name: "idle",
    frame: 0,
    lastFrameTime: performance.now(),
  });

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
        if (e.key === "a" || e.key === "ArrowLeft") facingRef.current = "left";
        if (e.key === "d" || e.key === "ArrowRight") facingRef.current = "right";
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
            x: clamp(x, 0, rect.width - PLAYER_WIDTH),
            y: clamp(y, 0, rect.height - PLAYER_HEIGHT),
          };
        });
      }
      const isMoving = heldKeys.current.size > 0;
      const nextAnimation = isMoving ? "walk" : "idle";
      const anim = animationRef.current;
      if (anim.name !== nextAnimation) {
        anim.name = nextAnimation;
        anim.frame = 0;
        anim.lastFrameTime = now;
      }
      const sprite = SPRITES[anim.name];
      const frameDuration = 1000 / sprite.fps;
      if (now - anim.lastFrameTime >= frameDuration) {
        const framesToAdvance = Math.floor((now - anim.lastFrameTime) / frameDuration);
        anim.frame = (anim.frame + framesToAdvance) % sprite.frames;
        anim.lastFrameTime += framesToAdvance * frameDuration;
      }
      requestAnimationFrame(tick);
    };
    lastTick.current = performance.now();
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const playerCenterX = player.x + PLAYER_WIDTH / 2;
  const playerCenterY = player.y + PLAYER_HEIGHT / 2;
  const wizardCenterX = wizard.x + WIZARD_SIZE / 2;
  const wizardCenterY = wizard.y + WIZARD_SIZE / 2;
  const distance = Math.hypot(playerCenterX - wizardCenterX, playerCenterY - wizardCenterY);

  const handleWizardClick = () => {
    if (distance <= TRIGGER_DISTANCE) {
      navigate("/dashboard/main", { replace: true });
    }
  };

  const sprite = SPRITES[animationRef.current.name];
  const sheetWidth = SPRITE_FRAME_WIDTH * sprite.frames * SPRITE_SCALE;
  const characterStyle = {
    left: player.x,
    top: player.y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    backgroundImage: `url(${sprite.src})`,
    backgroundPosition: `-${animationRef.current.frame * PLAYER_WIDTH}px 0px`,
    backgroundSize: `${sheetWidth}px ${PLAYER_HEIGHT}px`,
  };
  const characterClassName = `wg-character${facingRef.current === "left" ? " wg-character--left" : ""}`;

  return (
    <div className="wg-root">
      <div className="wg-arena" ref={containerRef}>
        <div
          className={characterClassName}
          style={characterStyle}
        />
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
