import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WizardGate.css";
import idleSprite from "../assets/characters/mainChar/IDLE.png";
import walkSprite from "../assets/characters/mainChar/WALK.png";
import runSprite from "../assets/characters/mainChar/RUN.png";
import attackSprite from "../assets/characters/mainChar/ATTACK 1.png";
import defendSprite from "../assets/characters/mainChar/DEFEND.png";
import hurtSprite from "../assets/characters/mainChar/HURT.png";
import jumpSprite from "../assets/characters/mainChar/JUMP.png";
import skeletonIdleSprite from "../assets/characters/skeleton/Skeleton_01_White_Idle.png";
import skeletonWalkSprite from "../assets/characters/skeleton/Skeleton_01_White_Walk.png";
import skeletonAttackSprite from "../assets/characters/skeleton/Skeleton_01_White_Attack1.png";
import skeletonHurtSprite from "../assets/characters/skeleton/Skeleton_01_White_Hurt.png";
import skeletonDeathSprite from "../assets/characters/skeleton/Skeleton_01_White_Die.png";

const SPRITE_FRAME_WIDTH = 96;
const SPRITE_FRAME_HEIGHT = 84;
const SPRITE_SCALE = 3.2;
const PLAYER_WIDTH = SPRITE_FRAME_WIDTH * SPRITE_SCALE;
const PLAYER_HEIGHT = SPRITE_FRAME_HEIGHT * SPRITE_SCALE;
const PLAYER_FOOT_PADDING = 22;
const PLAYER_FOOT_OFFSET = PLAYER_FOOT_PADDING * SPRITE_SCALE;
const PLAYER_COLLISION_WIDTH = PLAYER_WIDTH * 0.4;
const PLAYER_COLLISION_OFFSET = (PLAYER_WIDTH - PLAYER_COLLISION_WIDTH) / 2;
const PLAYER_BODY_WIDTH = PLAYER_WIDTH * 0.26;
const PLAYER_BODY_HEIGHT = PLAYER_HEIGHT * 0.35;
const PLAYER_BODY_OFFSET_X = (PLAYER_WIDTH - PLAYER_BODY_WIDTH) / 2;
const PLAYER_BODY_OFFSET_Y = PLAYER_HEIGHT - PLAYER_FOOT_OFFSET - PLAYER_BODY_HEIGHT;
const SKELETON_FRAME_WIDTH = 96;
const SKELETON_FRAME_HEIGHT = 64;
const SKELETON_SCALE = 2.4;
const SKELETON_WIDTH = SKELETON_FRAME_WIDTH * SKELETON_SCALE;
const SKELETON_HEIGHT = SKELETON_FRAME_HEIGHT * SKELETON_SCALE;
const SKELETON_FOOT_PADDING = 0;
const SKELETON_FOOT_OFFSET = SKELETON_FOOT_PADDING * SKELETON_SCALE;
const SKELETON_COLLISION_WIDTH = SKELETON_WIDTH * 0.4;
const SKELETON_COLLISION_OFFSET = (SKELETON_WIDTH - SKELETON_COLLISION_WIDTH) / 2;
const SKELETON_BODY_WIDTH = SKELETON_WIDTH * 0.22;
const SKELETON_BODY_HEIGHT = SKELETON_HEIGHT * 0.32;
const SKELETON_BODY_OFFSET_X = (SKELETON_WIDTH - SKELETON_BODY_WIDTH) / 2;
const SKELETON_BODY_OFFSET_Y = SKELETON_HEIGHT - SKELETON_FOOT_OFFSET - SKELETON_BODY_HEIGHT;
const WIZARD_SIZE = 30;
const WALK_SPEED = 240; // pixels per second
const RUN_SPEED = 360;
const RUN_TRIGGER_MS = 1000;
const RUN_RAMP_MS = 450;
const SKELETON_SPEED = 40;
const COLLISION_GAP = 2;
const MELEE_RANGE = 12;
const SKELETON_ATTACK_RANGE = MELEE_RANGE + 6;
const SKELETON_ATTACK_COOLDOWN_MS = 2000;
const TRIGGER_DISTANCE = 50;
const JUMP_DURATION_MS = 650;
const JUMP_HEIGHT = 90;
const MAX_HEARTS = 3;
const PLAYER_ATTACK_IMPACT_FRAMES = new Set([3, 4]);
const SKELETON_ATTACK_IMPACT_FRAMES = new Set([5, 6]);
const SPRITES = {
  idle: { src: idleSprite, frames: 7, fps: 6 },
  walk: { src: walkSprite, frames: 8, fps: 10 },
  run: { src: runSprite, frames: 8, fps: 12 },
  attack: { src: attackSprite, frames: 6, fps: 14 },
  defend: { src: defendSprite, frames: 6, fps: 10 },
  hurt: { src: hurtSprite, frames: 4, fps: 10 },
  jump: { src: jumpSprite, frames: 5, fps: 10 },
};
const SKELETON_SPRITES = {
  idle: { src: skeletonIdleSprite, frames: 8, fps: 8 },
  walk: { src: skeletonWalkSprite, frames: 10, fps: 10 },
  attack: { src: skeletonAttackSprite, frames: 10, fps: 10 },
  hurt: { src: skeletonHurtSprite, frames: 5, fps: 10 },
  death: { src: skeletonDeathSprite, frames: 13, fps: 10 },
};
const getPlayerHitbox = (x) => ({
  left: x + PLAYER_COLLISION_OFFSET,
  right: x + PLAYER_COLLISION_OFFSET + PLAYER_COLLISION_WIDTH,
});
const getSkeletonHitbox = (x) => ({
  left: x + SKELETON_COLLISION_OFFSET,
  right: x + SKELETON_COLLISION_OFFSET + SKELETON_COLLISION_WIDTH,
});
const getPlayerBodyBox = (x, y) => ({
  left: x + PLAYER_BODY_OFFSET_X,
  right: x + PLAYER_BODY_OFFSET_X + PLAYER_BODY_WIDTH,
  top: y + PLAYER_BODY_OFFSET_Y,
  bottom: y + PLAYER_BODY_OFFSET_Y + PLAYER_BODY_HEIGHT,
});
const getSkeletonBodyBox = (x, y) => ({
  left: x + SKELETON_BODY_OFFSET_X,
  right: x + SKELETON_BODY_OFFSET_X + SKELETON_BODY_WIDTH,
  top: y + SKELETON_BODY_OFFSET_Y,
  bottom: y + SKELETON_BODY_OFFSET_Y + SKELETON_BODY_HEIGHT,
});
const getGap = (playerX, skeletonX) => {
  const playerBox = getPlayerHitbox(playerX);
  const skeletonBox = getSkeletonHitbox(skeletonX);
  if (skeletonBox.left >= playerBox.right) return skeletonBox.left - playerBox.right;
  if (playerBox.left >= skeletonBox.right) return playerBox.left - skeletonBox.right;
  const overlapLeft = playerBox.right - skeletonBox.left;
  const overlapRight = skeletonBox.right - playerBox.left;
  return -Math.min(overlapLeft, overlapRight);
};
const getBodyGap = (playerX, playerY, skeletonX, skeletonY) => {
  const playerBox = getPlayerBodyBox(playerX, playerY);
  const skeletonBox = getSkeletonBodyBox(skeletonX, skeletonY);
  const overlapY = playerBox.bottom > skeletonBox.top && playerBox.top < skeletonBox.bottom;
  if (!overlapY) {
    return { overlapY: false, gap: Number.POSITIVE_INFINITY, playerBox, skeletonBox };
  }
  if (skeletonBox.left >= playerBox.right) {
    return { overlapY: true, gap: skeletonBox.left - playerBox.right, playerBox, skeletonBox };
  }
  if (playerBox.left >= skeletonBox.right) {
    return { overlapY: true, gap: playerBox.left - skeletonBox.right, playerBox, skeletonBox };
  }
  const overlapLeft = playerBox.right - skeletonBox.left;
  const overlapRight = skeletonBox.right - playerBox.left;
  return {
    overlapY: true,
    gap: -Math.min(overlapLeft, overlapRight),
    playerBox,
    skeletonBox,
  };
};

export default function WizardGate() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [player, setPlayer] = useState({ x: 150, y: 150 });
  const [wizard, setWizard] = useState({ x: 0, y: 0 });
  const [skeleton, setSkeleton] = useState({ x: 0, y: 0 });
  const [playerHearts, setPlayerHearts] = useState(MAX_HEARTS);
  const [skeletonHearts, setSkeletonHearts] = useState(MAX_HEARTS);
  const playerRef = useRef(player);
  const skeletonRef = useRef(skeleton);
  const groundYRef = useRef(null);
  const playerHeartsRef = useRef(playerHearts);
  const skeletonHeartsRef = useRef(skeletonHearts);
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
    lockedPosition: null,
    hasHit: false,
  });
  const defendRef = useRef({
    active: false,
    frame: 0,
    lastFrameTime: performance.now(),
    facing: "right",
    lockedPosition: null,
  });
  const skeletonAttackRef = useRef({
    active: false,
    facing: "left",
    lockedPosition: null,
    lastAttackTime: -Infinity,
    hasHit: false,
  });
  const playerHurtRef = useRef({
    active: false,
    frame: 0,
    lastFrameTime: performance.now(),
    facing: "right",
    lockedPosition: null,
  });
  const jumpRef = useRef({
    active: false,
    startTime: 0,
  });
  const skeletonHurtRef = useRef({
    active: false,
    frame: 0,
    lastFrameTime: performance.now(),
    facing: "left",
  });
  const skeletonDeathRef = useRef({
    active: false,
    frame: 0,
    lastFrameTime: performance.now(),
    facing: "left",
  });
  const skeletonAnimationRef = useRef({
    name: "idle",
    frame: 0,
    lastFrameTime: performance.now(),
  });
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  // Position wizard near the right edge once container is measured
  useEffect(() => {
    const placeActors = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const minGroundY = Math.max(
        PLAYER_HEIGHT - PLAYER_FOOT_OFFSET,
        SKELETON_HEIGHT - SKELETON_FOOT_OFFSET
      );
      const maxGroundY = rect.height - Math.max(PLAYER_FOOT_OFFSET, SKELETON_FOOT_OFFSET);
      const groundY = clamp(rect.height * 0.58, minGroundY, maxGroundY);
      groundYRef.current = groundY;
      const playerY = groundY - PLAYER_HEIGHT + PLAYER_FOOT_OFFSET;
      const skeletonY = groundY - SKELETON_HEIGHT + SKELETON_FOOT_OFFSET;
      setPlayer((prev) => ({ ...prev, y: playerY }));
      setWizard({
        x: rect.width - 120,
        y: rect.height / 2 - WIZARD_SIZE / 2,
      });
      const skeletonX = Math.max(rect.width - SKELETON_WIDTH - 48, 0);
      setSkeleton({ x: skeletonX, y: skeletonY });
    };
    placeActors();
    window.addEventListener("resize", placeActors);
    return () => window.removeEventListener("resize", placeActors);
  }, []);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);
  useEffect(() => {
    skeletonRef.current = skeleton;
  }, [skeleton]);
  useEffect(() => {
    playerHeartsRef.current = playerHearts;
  }, [playerHearts]);
  useEffect(() => {
    skeletonHeartsRef.current = skeletonHearts;
  }, [skeletonHearts]);
  const triggerAttack = () => {
    if (
      attackRef.current.active ||
      playerHurtRef.current.active ||
      skeletonAttackRef.current.active ||
      jumpRef.current.active ||
      defendRef.current.active
    ) {
      return;
    }
    const k = heldKeys.current;
    const movingLeft = k.has("a") || k.has("ArrowLeft");
    const movingRight = k.has("d") || k.has("ArrowRight");
    const moveX = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
    const attackFacing = moveX !== 0 ? (moveX < 0 ? "left" : "right") : facingRef.current;
    facingRef.current = attackFacing;
    runHold.current = { start: null, direction: 0 };
    attackRef.current = {
      active: true,
      frame: 0,
      lastFrameTime: performance.now(),
      facing: attackFacing,
      lockedPosition: { x: player.x, y: player.y },
      hasHit: false,
    };
  };
  const triggerDefend = () => {
    if (
      defendRef.current.active ||
      playerHurtRef.current.active ||
      attackRef.current.active ||
      jumpRef.current.active
    ) {
      return;
    }
    const k = heldKeys.current;
    const movingLeft = k.has("a") || k.has("ArrowLeft");
    const movingRight = k.has("d") || k.has("ArrowRight");
    const moveX = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
    const defendFacing = moveX !== 0 ? (moveX < 0 ? "left" : "right") : facingRef.current;
    facingRef.current = defendFacing;
    runHold.current = { start: null, direction: 0 };
    defendRef.current = {
      active: true,
      frame: 0,
      lastFrameTime: performance.now(),
      facing: defendFacing,
      lockedPosition: { x: player.x, y: player.y },
    };
  };
  const triggerJump = () => {
    if (
      jumpRef.current.active ||
      playerHurtRef.current.active ||
      attackRef.current.active ||
      defendRef.current.active
    ) {
      return;
    }
    const jumpStart = performance.now();
    jumpRef.current = {
      active: true,
      startTime: jumpStart,
    };
    animationRef.current = {
      name: "jump",
      frame: 0,
      lastFrameTime: jumpStart,
    };
  };
  const resetScene = (now = performance.now()) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const minGroundY = Math.max(
      PLAYER_HEIGHT - PLAYER_FOOT_OFFSET,
      SKELETON_HEIGHT - SKELETON_FOOT_OFFSET
    );
    const maxGroundY = rect.height - Math.max(PLAYER_FOOT_OFFSET, SKELETON_FOOT_OFFSET);
    const groundY = clamp(rect.height * 0.58, minGroundY, maxGroundY);
    groundYRef.current = groundY;
    const playerY = groundY - PLAYER_HEIGHT + PLAYER_FOOT_OFFSET;
    const skeletonY = groundY - SKELETON_HEIGHT + SKELETON_FOOT_OFFSET;
    const playerX = 150;
    const skeletonX = Math.max(rect.width - SKELETON_WIDTH - 48, 0);
    const nextPlayer = {
      x: clamp(playerX, 0, rect.width - PLAYER_WIDTH),
      y: playerY,
    };
    const nextSkeleton = {
      x: clamp(skeletonX, 0, rect.width - SKELETON_WIDTH),
      y: skeletonY,
    };
    playerRef.current = nextPlayer;
    skeletonRef.current = nextSkeleton;
    setPlayer(nextPlayer);
    setSkeleton(nextSkeleton);
    setWizard({
      x: rect.width - 120,
      y: rect.height / 2 - WIZARD_SIZE / 2,
    });
    heldKeys.current.clear();
    runHold.current = { start: null, direction: 0 };
    facingRef.current = "right";
    animationRef.current = {
      name: "idle",
      frame: 0,
      lastFrameTime: now,
    };
    attackRef.current = {
      active: false,
      frame: 0,
      lastFrameTime: now,
      facing: "right",
      lockedPosition: null,
      hasHit: false,
    };
    defendRef.current = {
      active: false,
      frame: 0,
      lastFrameTime: now,
      facing: "right",
      lockedPosition: null,
    };
    playerHurtRef.current = {
      active: false,
      frame: 0,
      lastFrameTime: now,
      facing: "right",
      lockedPosition: null,
    };
    jumpRef.current = {
      active: false,
      startTime: 0,
    };
    skeletonAttackRef.current = {
      active: false,
      facing: "left",
      lockedPosition: null,
      lastAttackTime: -Infinity,
      hasHit: false,
    };
    skeletonHurtRef.current = {
      active: false,
      frame: 0,
      lastFrameTime: now,
      facing: "left",
    };
    skeletonDeathRef.current = {
      active: false,
      frame: 0,
      lastFrameTime: now,
      facing: "left",
    };
    skeletonAnimationRef.current = {
      name: "idle",
      frame: 0,
      lastFrameTime: now,
    };
    playerHeartsRef.current = MAX_HEARTS;
    skeletonHeartsRef.current = MAX_HEARTS;
    setPlayerHearts(MAX_HEARTS);
    setSkeletonHearts(MAX_HEARTS);
  };

  useEffect(() => {
    const onDown = (e) => {
      if (e.code === "Space" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (!e.repeat) {
          triggerJump();
        }
        return;
      }
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
      const skeletonAttack = skeletonAttackRef.current;
      const isPlayerAttacking = attackRef.current.active;
      const playerHurt = playerHurtRef.current;
      const defend = defendRef.current;
      const skeletonHurt = skeletonHurtRef.current;
      const skeletonDeath = skeletonDeathRef.current;
      const jump = jumpRef.current;
      const rect = containerRef.current?.getBoundingClientRect();
      const currentPlayer = playerRef.current;
      const currentSkeleton = skeletonRef.current;
      const basePlayerY = groundYRef.current !== null
        ? groundYRef.current - PLAYER_HEIGHT + PLAYER_FOOT_OFFSET
        : currentPlayer.y;
      const k = heldKeys.current;
      const movingLeft = k.has("a") || k.has("ArrowLeft");
      const movingRight = k.has("d") || k.has("ArrowRight");
      const moveX = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
      const playerLocked = isPlayerAttacking || playerHurt.active || defend.active;
      const skeletonDead = skeletonDeath.active || skeletonHeartsRef.current <= 0;
      const skeletonLocked = skeletonDead || skeletonAttack.active || skeletonHurt.active || isPlayerAttacking;
      const isMoving = !playerLocked && moveX !== 0;
      if (!playerLocked && moveX !== 0) {
        facingRef.current = moveX < 0 ? "left" : "right";
      }
      if (playerLocked || moveX === 0) {
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
        let nextPlayerX = currentPlayer.x;
        let nextPlayerY = basePlayerY;
        if (playerLocked) {
          if (isPlayerAttacking && attackRef.current.lockedPosition) {
            nextPlayerX = attackRef.current.lockedPosition.x;
            nextPlayerY = attackRef.current.lockedPosition.y;
          } else if (defend.active && defend.lockedPosition) {
            nextPlayerX = defend.lockedPosition.x;
            nextPlayerY = defend.lockedPosition.y;
          } else if (playerHurt.active && playerHurt.lockedPosition) {
            nextPlayerX = playerHurt.lockedPosition.x;
          }
        } else {
          const delta = speed * dt;
          if (moveX !== 0) nextPlayerX += moveX * delta;
        }
        if (jump.active) {
          const jumpElapsed = now - jump.startTime;
          if (jumpElapsed >= JUMP_DURATION_MS) {
            jump.active = false;
            jump.startTime = 0;
          } else {
            const t = jumpElapsed / JUMP_DURATION_MS;
            const jumpOffset = 4 * t * (1 - t) * JUMP_HEIGHT;
            nextPlayerY = basePlayerY - jumpOffset;
          }
        }
        let nextSkeletonX = currentSkeleton.x;
        let skeletonMoving = false;
        if (!playerLocked && !skeletonDead) {
          const bodyGap = getBodyGap(
            nextPlayerX,
            nextPlayerY,
            currentSkeleton.x,
            currentSkeleton.y
          );
          if (bodyGap.overlapY && bodyGap.gap < COLLISION_GAP) {
            const skeletonBox = bodyGap.skeletonBox;
            if (nextPlayerX + PLAYER_WIDTH / 2 < currentSkeleton.x + SKELETON_WIDTH / 2) {
              nextPlayerX = skeletonBox.left - COLLISION_GAP - PLAYER_BODY_OFFSET_X - PLAYER_BODY_WIDTH;
            } else {
              nextPlayerX = skeletonBox.right + COLLISION_GAP - PLAYER_BODY_OFFSET_X;
            }
          }
        }
        if (skeletonLocked) {
          if (skeletonAttack.active && skeletonAttack.lockedPosition) {
            nextSkeletonX = skeletonAttack.lockedPosition.x;
          }
        } else {
          const bodyGap = getBodyGap(
            nextPlayerX,
            nextPlayerY,
            currentSkeleton.x,
            currentSkeleton.y
          );
          const attackGap = getGap(nextPlayerX, currentSkeleton.x);
          const remainingDistance = (bodyGap.overlapY ? bodyGap.gap : attackGap) - COLLISION_GAP;
          if (remainingDistance > 0.5) {
            const direction = nextPlayerX + PLAYER_WIDTH / 2 < currentSkeleton.x + SKELETON_WIDTH / 2 ? -1 : 1;
            const step = Math.min(remainingDistance, SKELETON_SPEED * dt);
            nextSkeletonX = currentSkeleton.x + direction * step;
          }
        }
        const nextPlayer = {
          x: clamp(nextPlayerX, 0, rect.width - PLAYER_WIDTH),
          y: clamp(nextPlayerY, 0, rect.height - PLAYER_HEIGHT),
        };
        const nextSkeleton = {
          x: clamp(nextSkeletonX, 0, rect.width - SKELETON_WIDTH),
          y: currentSkeleton.y,
        };
        if (!playerLocked && !skeletonDead) {
          const bodyGapAfter = getBodyGap(
            nextPlayer.x,
            nextPlayer.y,
            nextSkeleton.x,
            nextSkeleton.y
          );
          if (bodyGapAfter.overlapY && bodyGapAfter.gap < COLLISION_GAP) {
            const skeletonBox = bodyGapAfter.skeletonBox;
            if (nextPlayer.x + PLAYER_WIDTH / 2 < nextSkeleton.x + SKELETON_WIDTH / 2) {
              nextPlayer.x = skeletonBox.left - COLLISION_GAP - PLAYER_BODY_OFFSET_X - PLAYER_BODY_WIDTH;
            } else {
              nextPlayer.x = skeletonBox.right + COLLISION_GAP - PLAYER_BODY_OFFSET_X;
            }
            nextPlayer.x = clamp(nextPlayer.x, 0, rect.width - PLAYER_WIDTH);
          }
        }
        const gapAfter = getGap(nextPlayer.x, nextSkeleton.x);
        const inMelee = gapAfter <= MELEE_RANGE;
        const skeletonFacing = nextSkeleton.x + SKELETON_WIDTH / 2 > nextPlayer.x + PLAYER_WIDTH / 2 ? "left" : "right";
        if (!skeletonDead && !skeletonAttack.active && !skeletonHurt.active && !isPlayerAttacking) {
          if (gapAfter <= SKELETON_ATTACK_RANGE) {
            const timeSinceAttack = now - skeletonAttack.lastAttackTime;
            if (timeSinceAttack >= SKELETON_ATTACK_COOLDOWN_MS) {
              skeletonAttack.active = true;
              skeletonAttack.facing = skeletonFacing;
              skeletonAttack.lockedPosition = { x: nextSkeleton.x, y: nextSkeleton.y };
              skeletonAttack.lastAttackTime = now;
              skeletonAttack.hasHit = false;
              skeletonAnimationRef.current = {
                name: "attack",
                frame: 0,
                lastFrameTime: now,
              };
            }
          }
        }
        const playerImpact = PLAYER_ATTACK_IMPACT_FRAMES.has(attackRef.current.frame);
        const skeletonImpact = SKELETON_ATTACK_IMPACT_FRAMES.has(skeletonAnimationRef.current.frame);
        if (!skeletonDead && attackRef.current.active && playerImpact && !attackRef.current.hasHit && inMelee && !skeletonHurt.active) {
          attackRef.current.hasHit = true;
          const nextSkeletonHearts = Math.max(0, skeletonHeartsRef.current - 1);
          skeletonHeartsRef.current = nextSkeletonHearts;
          setSkeletonHearts(nextSkeletonHearts);
          if (nextSkeletonHearts <= 0) {
            skeletonDeath.active = true;
            skeletonDeath.frame = 0;
            skeletonDeath.lastFrameTime = now;
            skeletonDeath.facing = skeletonFacing;
            skeletonAttack.active = false;
            skeletonAttack.lockedPosition = null;
            skeletonAttack.hasHit = false;
            skeletonHurt.active = false;
            skeletonAnimationRef.current = {
              name: "death",
              frame: 0,
              lastFrameTime: now,
            };
          } else {
            skeletonHurt.active = true;
            skeletonHurt.frame = 0;
            skeletonHurt.lastFrameTime = now;
            skeletonHurt.facing = skeletonFacing;
            skeletonAttack.active = false;
            skeletonAttack.lockedPosition = null;
            skeletonAttack.hasHit = false;
          }
        }
        if (!skeletonDead && skeletonAttack.active && skeletonImpact && !skeletonAttack.hasHit && inMelee) {
          if (defend.active) {
            skeletonAttack.hasHit = true;
          } else if (!playerHurt.active) {
            skeletonAttack.hasHit = true;
            const nextPlayerHearts = Math.max(0, playerHeartsRef.current - 1);
            playerHeartsRef.current = nextPlayerHearts;
            setPlayerHearts(nextPlayerHearts);
            if (nextPlayerHearts <= 0) {
              resetScene(now);
              requestAnimationFrame(tick);
              return;
            }
            playerHurt.active = true;
            playerHurt.frame = 0;
            playerHurt.lastFrameTime = now;
            playerHurt.facing = facingRef.current;
            playerHurt.lockedPosition = { x: nextPlayer.x };
            attackRef.current.active = false;
            attackRef.current.lockedPosition = null;
            attackRef.current.hasHit = false;
          }
        }
        playerRef.current = nextPlayer;
        skeletonRef.current = nextSkeleton;
        setPlayer(nextPlayer);
        setSkeleton(nextSkeleton);

        skeletonMoving = !skeletonLocked && Math.abs(nextSkeleton.x - currentSkeleton.x) > 0.1;
        const skeletonAnim = skeletonAnimationRef.current;
        if (!skeletonAttack.active && !skeletonHurt.active && !skeletonDeath.active) {
          const nextSkeletonAnimation = skeletonMoving ? "walk" : "idle";
          if (skeletonAnim.name !== nextSkeletonAnimation) {
            skeletonAnim.name = nextSkeletonAnimation;
            skeletonAnim.frame = 0;
            skeletonAnim.lastFrameTime = now;
          }
        }
      }
      if (!playerHurt.active) {
        const nextAnimation = jump.active
          ? "jump"
          : (isMoving ? (runRamp > 0 ? "run" : "walk") : "idle");
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
          if (anim.name === "jump") {
            const nextFrame = anim.frame + framesToAdvance;
            if (nextFrame >= sprite.frames) {
              anim.frame = sprite.frames - 1;
              anim.lastFrameTime = now;
            } else {
              anim.frame = nextFrame;
              anim.lastFrameTime += framesToAdvance * frameDuration;
            }
          } else {
            anim.frame = (anim.frame + framesToAdvance) % sprite.frames;
            anim.lastFrameTime += framesToAdvance * frameDuration;
          }
        }
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
            attack.lockedPosition = null;
            attack.hasHit = false;
            animationRef.current.lastFrameTime = now;
          } else {
            attack.frame = nextFrame;
            attack.lastFrameTime += framesToAdvance * attackFrameDuration;
          }
        }
      }
      const defendAnim = defendRef.current;
      if (defendAnim.active) {
        const defendSpriteFrames = SPRITES.defend;
        const defendFrameDuration = 1000 / defendSpriteFrames.fps;
        if (now - defendAnim.lastFrameTime >= defendFrameDuration) {
          const framesToAdvance = Math.floor((now - defendAnim.lastFrameTime) / defendFrameDuration);
          const nextFrame = defendAnim.frame + framesToAdvance;
          if (nextFrame >= defendSpriteFrames.frames) {
            defendAnim.active = false;
            defendAnim.frame = 0;
            defendAnim.lastFrameTime = now;
            defendAnim.lockedPosition = null;
            animationRef.current.lastFrameTime = now;
          } else {
            defendAnim.frame = nextFrame;
            defendAnim.lastFrameTime += framesToAdvance * defendFrameDuration;
          }
        }
      }
      if (playerHurt.active) {
        const hurtSprite = SPRITES.hurt;
        const hurtFrameDuration = 1000 / hurtSprite.fps;
        if (now - playerHurt.lastFrameTime >= hurtFrameDuration) {
          const framesToAdvance = Math.floor((now - playerHurt.lastFrameTime) / hurtFrameDuration);
          const nextFrame = playerHurt.frame + framesToAdvance;
          if (nextFrame >= hurtSprite.frames) {
            playerHurt.active = false;
            playerHurt.frame = 0;
            playerHurt.lastFrameTime = now;
            playerHurt.lockedPosition = null;
            animationRef.current.lastFrameTime = now;
          } else {
            playerHurt.frame = nextFrame;
            playerHurt.lastFrameTime += framesToAdvance * hurtFrameDuration;
          }
        }
      }
      const skeletonAnim = skeletonAnimationRef.current;
      if (skeletonDeath.active) {
        const deathSprite = SKELETON_SPRITES.death;
        const deathFrameDuration = 1000 / deathSprite.fps;
        if (now - skeletonDeath.lastFrameTime >= deathFrameDuration) {
          const framesToAdvance = Math.floor((now - skeletonDeath.lastFrameTime) / deathFrameDuration);
          const nextFrame = skeletonDeath.frame + framesToAdvance;
          if (nextFrame >= deathSprite.frames) {
            skeletonDeath.frame = deathSprite.frames - 1;
            skeletonDeath.lastFrameTime = now;
          } else {
            skeletonDeath.frame = nextFrame;
            skeletonDeath.lastFrameTime += framesToAdvance * deathFrameDuration;
          }
        }
      } else if (skeletonHurt.active) {
        const hurtSprite = SKELETON_SPRITES.hurt;
        const hurtFrameDuration = 1000 / hurtSprite.fps;
        if (now - skeletonHurt.lastFrameTime >= hurtFrameDuration) {
          const framesToAdvance = Math.floor((now - skeletonHurt.lastFrameTime) / hurtFrameDuration);
          const nextFrame = skeletonHurt.frame + framesToAdvance;
          if (nextFrame >= hurtSprite.frames) {
            skeletonHurt.active = false;
            skeletonHurt.frame = 0;
            skeletonHurt.lastFrameTime = now;
            skeletonAnim.name = "idle";
            skeletonAnim.frame = 0;
            skeletonAnim.lastFrameTime = now;
          } else {
            skeletonHurt.frame = nextFrame;
            skeletonHurt.lastFrameTime += framesToAdvance * hurtFrameDuration;
          }
        }
      } else if (skeletonAttack.active) {
        const attackSprite = SKELETON_SPRITES.attack;
        const attackFrameDuration = 1000 / attackSprite.fps;
        if (now - skeletonAnim.lastFrameTime >= attackFrameDuration) {
          const framesToAdvance = Math.floor((now - skeletonAnim.lastFrameTime) / attackFrameDuration);
          const nextFrame = skeletonAnim.frame + framesToAdvance;
          if (nextFrame >= attackSprite.frames) {
            skeletonAttack.active = false;
            skeletonAttack.lockedPosition = null;
            skeletonAttack.hasHit = false;
            skeletonAnim.name = "idle";
            skeletonAnim.frame = 0;
            skeletonAnim.lastFrameTime = now;
          } else {
            skeletonAnim.frame = nextFrame;
            skeletonAnim.lastFrameTime += framesToAdvance * attackFrameDuration;
          }
        }
      } else {
        const skeletonSprite = SKELETON_SPRITES[skeletonAnim.name];
        const skeletonFrameDuration = 1000 / skeletonSprite.fps;
        if (now - skeletonAnim.lastFrameTime >= skeletonFrameDuration) {
          const framesToAdvance = Math.floor((now - skeletonAnim.lastFrameTime) / skeletonFrameDuration);
          skeletonAnim.frame = (skeletonAnim.frame + framesToAdvance) % skeletonSprite.frames;
          skeletonAnim.lastFrameTime += framesToAdvance * skeletonFrameDuration;
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
  const handleArenaMouseDown = (event) => {
    const target = event.target;
    if (event.button === 2) {
      event.preventDefault();
      if (target instanceof Element && target.closest(".wg-wizard")) return;
      triggerDefend();
      return;
    }
    if (event.button !== 0) return;
    if (target instanceof Element && target.closest(".wg-wizard")) return;
    triggerAttack();
  };
  const handleArenaContextMenu = (event) => {
    event.preventDefault();
  };

  const isPlayerHurt = playerHurtRef.current.active;
  const isPlayerAttacking = attackRef.current.active;
  const isPlayerDefending = defendRef.current.active;
  const sprite = isPlayerHurt
    ? SPRITES.hurt
    : (isPlayerAttacking
      ? SPRITES.attack
      : (isPlayerDefending ? SPRITES.defend : SPRITES[animationRef.current.name]));
  const frameIndex = isPlayerHurt
    ? playerHurtRef.current.frame
    : (isPlayerAttacking
      ? attackRef.current.frame
      : (isPlayerDefending ? defendRef.current.frame : animationRef.current.frame));
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
  const activeFacing = isPlayerHurt
    ? playerHurtRef.current.facing
    : (isPlayerAttacking
      ? attackRef.current.facing
      : (isPlayerDefending ? defendRef.current.facing : facingRef.current));
  const characterClassName = `wg-character${activeFacing === "left" ? " wg-character--left" : ""}`;
  const isSkeletonHurt = skeletonHurtRef.current.active;
  const isSkeletonAttacking = skeletonAttackRef.current.active;
  const isSkeletonDead = skeletonDeathRef.current.active;
  const skeletonSprite = isSkeletonDead
    ? SKELETON_SPRITES.death
    : (isSkeletonHurt
      ? SKELETON_SPRITES.hurt
      : (isSkeletonAttacking ? SKELETON_SPRITES.attack : SKELETON_SPRITES[skeletonAnimationRef.current.name]));
  const skeletonFrameIndex = isSkeletonDead
    ? skeletonDeathRef.current.frame
    : (isSkeletonHurt ? skeletonHurtRef.current.frame : skeletonAnimationRef.current.frame);
  const skeletonSheetWidth = SKELETON_FRAME_WIDTH * skeletonSprite.frames * SKELETON_SCALE;
  const skeletonStyle = {
    left: skeleton.x,
    top: skeleton.y,
    width: SKELETON_WIDTH,
    height: SKELETON_HEIGHT,
    backgroundImage: `url(${skeletonSprite.src})`,
    backgroundPosition: `-${skeletonFrameIndex * SKELETON_WIDTH}px 0px`,
    backgroundSize: `${skeletonSheetWidth}px ${SKELETON_HEIGHT}px`,
  };
  const skeletonFacing = isSkeletonDead
    ? skeletonDeathRef.current.facing
    : (isSkeletonHurt
      ? skeletonHurtRef.current.facing
      : (isSkeletonAttacking
        ? skeletonAttackRef.current.facing
        : (skeleton.x + SKELETON_WIDTH / 2 > player.x + PLAYER_WIDTH / 2 ? "left" : "right")));
  const skeletonClassName = `wg-character wg-skeleton${skeletonFacing === "left" ? " wg-character--left" : ""}`;

  return (
    <div className="wg-root">
      <div
        className="wg-arena"
        ref={containerRef}
        onMouseDown={handleArenaMouseDown}
        onContextMenu={handleArenaContextMenu}
      >
        <div className="wg-hearts" role="status" aria-label="Player lives">
          {Array.from({ length: MAX_HEARTS }).map((_, index) => (
            <span
              key={`heart-${index}`}
              className={`wg-heart${index < playerHearts ? " wg-heart--full" : " wg-heart--empty"}`}
            >
              ♥
            </span>
          ))}
        </div>
        <div
          className={characterClassName}
          style={characterStyle}
        />
        <div className={skeletonClassName} style={skeletonStyle} />
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
