import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WizardGate.css";
import idleSprite from "../assets/characters/mainChar/IDLE.png";
import walkSprite from "../assets/characters/mainChar/WALK.png";
import runSprite from "../assets/characters/mainChar/RUN.png";
import attackSprite from "../assets/characters/mainChar/ATTACK 1.png";

const SPRITE_FRAME_WIDTH = 96;
const SPRITE_FRAME_HEIGHT = 84;
const SPRITE_SCALE = 3;
const PLAYER_WIDTH = SPRITE_FRAME_WIDTH * SPRITE_SCALE;
const PLAYER_HEIGHT = SPRITE_FRAME_HEIGHT * SPRITE_SCALE;
const WIZARD_SIZE = 30;
const WALK_SPEED = 240; // pixels per second
const RUN_SPEED = 360;
const RUN_TRIGGER_MS = 1000;
const RUN_RAMP_MS = 450;
const TRIGGER_DISTANCE = 50;
const SPRITES = {
  idle: { src: idleSprite, frames: 7, fps: 6 },
  walk: { src: walkSprite, frames: 8, fps: 10 },
  run: { src: runSprite, frames: 8, fps: 12 },
  attack: { src: attackSprite, frames: 6, fps: 14 },
};

export default function WizardGate() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [player, setPlayer] = useState({ x: 150, y: 150 });
  const [wizard, setWizard] = useState({ x: 0, y: 0 });
  const heldKeys = useRef(new Set());
  const lastTick = useRef(performance.now());
  const runHold = useRef({ start: null, direction: 0 });
  const facingRef = useRef("right");
  const animationRef = useRef({
    name: "idle",
    frame: 0,
    lastFrameTime: performance.now(),
  });
  const attackRef = useRef({
    active: false,
    frame: 0,
    lastFrameTime: performance.now(),
    facing: "right",
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
      }
      if ((e.code === "Space" || e.key === " ") && !attackRef.current.active) {
        e.preventDefault();
        attackRef.current = {
          active: true,
          frame: 0,
          lastFrameTime: performance.now(),
          facing: facingRef.current,
        };
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
      const k = heldKeys.current;
      const movingLeft = k.has("a") || k.has("ArrowLeft");
      const movingRight = k.has("d") || k.has("ArrowRight");
      const movingUp = k.has("w") || k.has("ArrowUp");
      const movingDown = k.has("s") || k.has("ArrowDown");
      const moveX = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
      const moveY = (movingDown ? 1 : 0) - (movingUp ? 1 : 0);
      const isMoving = moveX !== 0 || moveY !== 0;
      if (moveX !== 0) {
        facingRef.current = moveX < 0 ? "left" : "right";
      }
      if (moveX === 0) {
        runHold.current = { start: null, direction: 0 };
      } else if (runHold.current.start === null || runHold.current.direction !== moveX) {
        runHold.current = { start: now, direction: moveX };
      }
      const runHeldMs = runHold.current.start ? now - runHold.current.start : 0;
      const runRamp = runHeldMs > RUN_TRIGGER_MS
        ? Math.min((runHeldMs - RUN_TRIGGER_MS) / RUN_RAMP_MS, 1)
        : 0;
      const speed = WALK_SPEED + runRamp * (RUN_SPEED - WALK_SPEED);
      if (rect) {
        setPlayer((prev) => {
          let { x, y } = prev;
          const delta = speed * dt;
          if (moveX !== 0) x += moveX * delta;
          if (moveY !== 0) y += moveY * delta;
          return {
            x: clamp(x, 0, rect.width - PLAYER_WIDTH),
            y: clamp(y, 0, rect.height - PLAYER_HEIGHT),
          };
        });
      }
      const nextAnimation = isMoving ? (runRamp > 0 ? "run" : "walk") : "idle";
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
      const attack = attackRef.current;
      if (attack.active) {
        const attackSpriteFrames = SPRITES.attack;
        const attackFrameDuration = 1000 / attackSpriteFrames.fps;
        if (now - attack.lastFrameTime >= attackFrameDuration) {
          const framesToAdvance = Math.floor((now - attack.lastFrameTime) / attackFrameDuration);
          const nextFrame = attack.frame + framesToAdvance;
          if (nextFrame >= attackSpriteFrames.frames) {
            attack.active = false;
            attack.frame = 0;
            attack.lastFrameTime = now;
            animationRef.current.lastFrameTime = now;
          } else {
            attack.frame = nextFrame;
            attack.lastFrameTime += framesToAdvance * attackFrameDuration;
          }
        }
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

  const isAttacking = attackRef.current.active;
  const sprite = isAttacking ? SPRITES.attack : SPRITES[animationRef.current.name];
  const frameIndex = isAttacking ? attackRef.current.frame : animationRef.current.frame;
  const sheetWidth = SPRITE_FRAME_WIDTH * sprite.frames * SPRITE_SCALE;
  const characterStyle = {
    left: player.x,
    top: player.y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    backgroundImage: `url(${sprite.src})`,
    backgroundPosition: `-${frameIndex * PLAYER_WIDTH}px 0px`,
    backgroundSize: `${sheetWidth}px ${PLAYER_HEIGHT}px`,
  };
  const activeFacing = isAttacking ? attackRef.current.facing : facingRef.current;
  const characterClassName = `wg-character${activeFacing === "left" ? " wg-character--left" : ""}`;

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
