import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import aceIdle0 from "../assets/characters/Ace/Idle/HeroKnight_Idle_0.png";
import aceIdle1 from "../assets/characters/Ace/Idle/HeroKnight_Idle_1.png";
import aceIdle2 from "../assets/characters/Ace/Idle/HeroKnight_Idle_2.png";
import aceIdle3 from "../assets/characters/Ace/Idle/HeroKnight_Idle_3.png";
import aceIdle4 from "../assets/characters/Ace/Idle/HeroKnight_Idle_4.png";
import aceIdle5 from "../assets/characters/Ace/Idle/HeroKnight_Idle_5.png";
import aceIdle6 from "../assets/characters/Ace/Idle/HeroKnight_Idle_6.png";
import aceIdle7 from "../assets/characters/Ace/Idle/HeroKnight_Idle_7.png";
import aceRoll0 from "../assets/characters/Ace/Roll/HeroKnight_Roll_0.png";
import aceRoll1 from "../assets/characters/Ace/Roll/HeroKnight_Roll_1.png";
import aceRoll2 from "../assets/characters/Ace/Roll/HeroKnight_Roll_2.png";
import aceRoll3 from "../assets/characters/Ace/Roll/HeroKnight_Roll_3.png";
import aceRoll4 from "../assets/characters/Ace/Roll/HeroKnight_Roll_4.png";
import aceRoll5 from "../assets/characters/Ace/Roll/HeroKnight_Roll_5.png";
import aceRoll6 from "../assets/characters/Ace/Roll/HeroKnight_Roll_6.png";
import aceRoll7 from "../assets/characters/Ace/Roll/HeroKnight_Roll_7.png";
import aceRoll8 from "../assets/characters/Ace/Roll/HeroKnight_Roll_8.png";
import aceBlock0 from "../assets/characters/Ace/BlockNoEffect/HeroKnight_BlockNoEffect_0.png";
import aceBlock1 from "../assets/characters/Ace/BlockNoEffect/HeroKnight_BlockNoEffect_1.png";
import aceBlock2 from "../assets/characters/Ace/BlockNoEffect/HeroKnight_BlockNoEffect_2.png";
import aceBlock3 from "../assets/characters/Ace/BlockNoEffect/HeroKnight_BlockNoEffect_3.png";
import aceBlock4 from "../assets/characters/Ace/BlockNoEffect/HeroKnight_BlockNoEffect_4.png";
import aceFall0 from "../assets/characters/Ace/Fall/HeroKnight_Fall_0.png";
import aceFall1 from "../assets/characters/Ace/Fall/HeroKnight_Fall_1.png";
import aceFall2 from "../assets/characters/Ace/Fall/HeroKnight_Fall_2.png";
import aceFall3 from "../assets/characters/Ace/Fall/HeroKnight_Fall_3.png";
import aceRun0 from "../assets/characters/Ace/Run/HeroKnight_Run_0.png";
import aceRun1 from "../assets/characters/Ace/Run/HeroKnight_Run_1.png";
import aceRun2 from "../assets/characters/Ace/Run/HeroKnight_Run_2.png";
import aceRun3 from "../assets/characters/Ace/Run/HeroKnight_Run_3.png";
import aceRun4 from "../assets/characters/Ace/Run/HeroKnight_Run_4.png";
import aceRun5 from "../assets/characters/Ace/Run/HeroKnight_Run_5.png";
import aceRun6 from "../assets/characters/Ace/Run/HeroKnight_Run_6.png";
import aceRun7 from "../assets/characters/Ace/Run/HeroKnight_Run_7.png";
import aceRun8 from "../assets/characters/Ace/Run/HeroKnight_Run_8.png";
import aceRun9 from "../assets/characters/Ace/Run/HeroKnight_Run_9.png";
import aceAttack0 from "../assets/characters/Ace/Attack1/HeroKnight_Attack1_0.png";
import aceAttack1 from "../assets/characters/Ace/Attack1/HeroKnight_Attack1_1.png";
import aceAttack2 from "../assets/characters/Ace/Attack1/HeroKnight_Attack1_2.png";
import aceAttack3 from "../assets/characters/Ace/Attack1/HeroKnight_Attack1_3.png";
import aceAttack4 from "../assets/characters/Ace/Attack1/HeroKnight_Attack1_4.png";
import aceAttack5 from "../assets/characters/Ace/Attack1/HeroKnight_Attack1_5.png";
import aceHead from "../assets/characters/Ace/KnightHead.png";

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
const ACE_FRAME_WIDTH = 100;
const ACE_FRAME_HEIGHT = 55;
const ACE_SCALE = 3;
const ACE_WIDTH = ACE_FRAME_WIDTH * ACE_SCALE;
const ACE_HEIGHT = ACE_FRAME_HEIGHT * ACE_SCALE;
const ACE_FOOT_PADDING = 0;
const ACE_FOOT_OFFSET = ACE_FOOT_PADDING * ACE_SCALE;
const ACE_COLLISION_WIDTH = ACE_WIDTH * 0.4;
const ACE_COLLISION_OFFSET = (ACE_WIDTH - ACE_COLLISION_WIDTH) / 2;
const ACE_BODY_WIDTH = ACE_WIDTH * 0.17;
const ACE_BODY_HEIGHT = ACE_HEIGHT * 0.38;
const ACE_BODY_OFFSET_X = (ACE_WIDTH - ACE_BODY_WIDTH) / 2;
const ACE_BODY_OFFSET_Y = ACE_HEIGHT - ACE_FOOT_OFFSET - ACE_BODY_HEIGHT;
const ACE_GROUND_OFFSET = 1;
const MULTI_SPAWN_OFFSET = SKELETON_WIDTH * 0.7;
const WAVE_THREE_INITIAL_COUNT = 2;
const WAVE_THREE_REINFORCEMENT_COUNT = 6;
const SKELETON_OFFSCREEN_MARGIN = SKELETON_WIDTH
  + MULTI_SPAWN_OFFSET * Math.max(WAVE_THREE_REINFORCEMENT_COUNT - 1, 0);
const WALK_SPEED = 240; // pixels per second
const RUN_SPEED = 360;
const RUN_TRIGGER_MS = 600;
const RUN_RAMP_MS = 250;
const SKELETON_SPEED = 40;
const SKELETON_SPEED_INCREMENT = 8;
const SKELETON_SPEED_WAVE_THREE = 110;
const COLLISION_GAP = 2;
const MELEE_RANGE = 12;
const SKELETON_ATTACK_RANGE = MELEE_RANGE + 6;
const SKELETON_ATTACK_COOLDOWN_MS = 2000;
const JUMP_DURATION_MS = 650;
const JUMP_HEIGHT = 90;
const MAX_HEARTS = 3;
const ACE_SPAWN_DELAY_MS = 3000;
const ACE_FALL_DURATION_MS = 900;
const ACE_FALL_START_Y = -ACE_HEIGHT;
const ACE_ROLL_SPEED = 900;
const ACE_WALK_SPEED = 220;
const ACE_APPROACH_GAP = 8;
const ACE_ATTACK_RANGE = 20;
const ACE_BLOCK_RANGE = ACE_ATTACK_RANGE * 2;
const ACE_CUTSCENE_SKELETON_SPEED = 360;
const ACE_EXIT_SPEED = ACE_WALK_SPEED;
const PLAYER_FOLLOW_SPEED = RUN_SPEED;
const ACE_FOLLOW_GAP = 24;
const WAVE_THREE_REINFORCEMENT_DISTANCE = SKELETON_WIDTH * 0.3;
const WAVE_THREE_REINFORCEMENT_DELAY_MS = 900;
const PLAYER_ATTACK_IMPACT_FRAMES = new Set([3, 4]);
const SKELETON_ATTACK_IMPACT_FRAMES = new Set([5, 6]);
const ACE_ATTACK_IMPACT_FRAMES = new Set([4]);
const ACE_DIALOGUE_LINES = [
  "Wassup...",
  "I'm Ace, your productivity companion",
  "These skeletons are the damned who didn't follow their dreams...",
  "If you honor my word, you won't end up like them.",
  "Follow me!",
];
const ACE_DIALOGUE_INTERRUPT_INDEX = 1;
const ACE_DIALOGUE_RESUME_INDEX = 2;
const ACE_DIALOGUE_FOLLOW_INDEX = ACE_DIALOGUE_LINES.length - 1;
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
const ACE_SPRITES = {
  idle: { frames: [aceIdle0, aceIdle1, aceIdle2, aceIdle3, aceIdle4, aceIdle5, aceIdle6, aceIdle7], fps: 8 },
  fall: { frames: [aceFall0, aceFall1, aceFall2, aceFall3], fps: 12 },
  roll: { frames: [aceRoll0, aceRoll1, aceRoll2, aceRoll3, aceRoll4, aceRoll5, aceRoll6, aceRoll7, aceRoll8], fps: 18 },
  block: { frames: [aceBlock0, aceBlock1, aceBlock2, aceBlock3, aceBlock4], fps: 12 },
  attack: { frames: [aceAttack0, aceAttack1, aceAttack2, aceAttack3, aceAttack4, aceAttack5], fps: 18 },
  approach: { frames: [aceRun0, aceRun1, aceRun2, aceRun3, aceRun4, aceRun5, aceRun6, aceRun7, aceRun8, aceRun9], fps: 8 },
  exit: { frames: [aceRun0, aceRun1, aceRun2, aceRun3, aceRun4, aceRun5, aceRun6, aceRun7, aceRun8, aceRun9], fps: 8 },
};
const getPlayerHitbox = (x) => ({
  left: x + PLAYER_COLLISION_OFFSET,
  right: x + PLAYER_COLLISION_OFFSET + PLAYER_COLLISION_WIDTH,
});
const getSkeletonHitbox = (x) => ({
  left: x + SKELETON_COLLISION_OFFSET,
  right: x + SKELETON_COLLISION_OFFSET + SKELETON_COLLISION_WIDTH,
});
const getAceHitbox = (x) => ({
  left: x + ACE_COLLISION_OFFSET,
  right: x + ACE_COLLISION_OFFSET + ACE_COLLISION_WIDTH,
});
const getAceBodyBox = (x, y) => ({
  left: x + ACE_BODY_OFFSET_X,
  right: x + ACE_BODY_OFFSET_X + ACE_BODY_WIDTH,
  top: y + ACE_BODY_OFFSET_Y,
  bottom: y + ACE_BODY_OFFSET_Y + ACE_BODY_HEIGHT,
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
const getAceSkeletonGap = (aceX, skeletonX) => {
  const aceBox = getAceHitbox(aceX);
  const skeletonBox = getSkeletonHitbox(skeletonX);
  if (skeletonBox.left >= aceBox.right) return skeletonBox.left - aceBox.right;
  if (aceBox.left >= skeletonBox.right) return aceBox.left - skeletonBox.right;
  const overlapLeft = aceBox.right - skeletonBox.left;
  const overlapRight = skeletonBox.right - aceBox.left;
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
const getAcePlayerBodyGap = (playerX, playerY, aceX, aceY) => {
  const playerBox = getPlayerBodyBox(playerX, playerY);
  const aceBox = getAceBodyBox(aceX, aceY);
  const overlapY = playerBox.bottom > aceBox.top && playerBox.top < aceBox.bottom;
  if (!overlapY) {
    return { overlapY: false, gap: Number.POSITIVE_INFINITY, playerBox, aceBox };
  }
  if (aceBox.left >= playerBox.right) {
    return { overlapY: true, gap: aceBox.left - playerBox.right, playerBox, aceBox };
  }
  if (playerBox.left >= aceBox.right) {
    return { overlapY: true, gap: playerBox.left - aceBox.right, playerBox, aceBox };
  }
  const overlapLeft = playerBox.right - aceBox.left;
  const overlapRight = aceBox.right - playerBox.left;
  return {
    overlapY: true,
    gap: -Math.min(overlapLeft, overlapRight),
    playerBox,
    aceBox,
  };
};
const markSkeletonDead = (skeleton, now, facing) => ({
  ...skeleton,
  hearts: 0,
  attack: {
    ...skeleton.attack,
    active: false,
    lockedPosition: null,
    hasHit: false,
    facing,
  },
  hurt: {
    ...skeleton.hurt,
    active: false,
    frame: 0,
    lastFrameTime: now,
    facing,
  },
  death: {
    ...skeleton.death,
    active: true,
    frame: 0,
    lastFrameTime: now,
    facing,
  },
  animation: {
    name: "death",
    frame: 0,
    lastFrameTime: now,
  },
});
const markSkeletonHurt = (skeleton, now, facing, heartsLeft) => ({
  ...skeleton,
  hearts: heartsLeft,
  attack: {
    ...skeleton.attack,
    active: false,
    lockedPosition: null,
    hasHit: false,
    facing,
  },
  hurt: {
    ...skeleton.hurt,
    active: true,
    frame: 0,
    lastFrameTime: now,
    facing,
  },
});
const advanceAceFrame = (ace, now, loop) => {
  const sprite = ACE_SPRITES[ace.state];
  const frameDuration = 1000 / sprite.fps;
  if (now - ace.lastFrameTime < frameDuration) {
    return { ace, done: false };
  }
  const framesToAdvance = Math.floor((now - ace.lastFrameTime) / frameDuration);
  let nextFrame = ace.frame + framesToAdvance;
  if (loop) {
    nextFrame %= sprite.frames.length;
    return {
      ace: {
        ...ace,
        frame: nextFrame,
        lastFrameTime: ace.lastFrameTime + framesToAdvance * frameDuration,
      },
      done: false,
    };
  }
  if (nextFrame >= sprite.frames.length) {
    return {
      ace: {
        ...ace,
        frame: sprite.frames.length - 1,
        lastFrameTime: now,
      },
      done: true,
    };
  }
  return {
    ace: {
      ...ace,
      frame: nextFrame,
      lastFrameTime: ace.lastFrameTime + framesToAdvance * frameDuration,
    },
    done: false,
  };
};

export default function WizardGate() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [skeletons, setSkeletons] = useState([]);
  const [ace, setAce] = useState(null);
  const [aceDialogueIndex, setAceDialogueIndex] = useState(null);
  const [playerHearts, setPlayerHearts] = useState(MAX_HEARTS);
  const playerRef = useRef(player);
  const skeletonsRef = useRef(skeletons);
  const aceRef = useRef(ace);
  const aceDialogueRef = useRef(aceDialogueIndex);
  const groundYRef = useRef(null);
  const playerHeartsRef = useRef(playerHearts);
  const skeletonWaveRef = useRef(0);
  const skeletonIdRef = useRef(0);
  const waveThreeStartRef = useRef(null);
  const waveThreeReinforcedRef = useRef(false);
  const aceInterruptionRef = useRef({
    pendingSpawn: false,
    active: false,
    returnTargetX: null,
    resumeDialogueIndex: null,
  });
  const aceExitRef = useRef(false);
  const exitNavigationRef = useRef(false);
  const playerFearRef = useRef(false);
  const initialPlacementRef = useRef(false);
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
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const clampSkeletonX = (value, rectWidth) =>
    clamp(value, -SKELETON_OFFSCREEN_MARGIN, rectWidth + SKELETON_OFFSCREEN_MARGIN);
  const clampPlayerX = (value, rectWidth, allowOffscreen) =>
    clamp(
      value,
      allowOffscreen ? -PLAYER_WIDTH : 0,
      allowOffscreen ? rectWidth + PLAYER_WIDTH : rectWidth - PLAYER_WIDTH
    );
  const createSkeleton = ({
    x,
    y,
    facing,
    now,
    spawnX = x,
    wave3Initial = false,
    wave3Reinforcement = false,
    speedOverride = null,
    noAttack = false,
  }) => ({
    id: skeletonIdRef.current++,
    x,
    y,
    spawnX,
    wave3Initial,
    wave3Reinforcement,
    speedOverride,
    noAttack,
    hearts: MAX_HEARTS,
    attack: {
      active: false,
      facing,
      lockedPosition: null,
      lastAttackTime: -Infinity,
      hasHit: false,
    },
    hurt: {
      active: false,
      frame: 0,
      lastFrameTime: now,
      facing,
    },
    death: {
      active: false,
      frame: 0,
      lastFrameTime: now,
      facing,
    },
    animation: {
      name: "idle",
      frame: 0,
      lastFrameTime: now,
    },
  });
  const spawnWave = (waveIndex, rect, groundY, now) => {
    const skeletonY = groundY - SKELETON_HEIGHT + SKELETON_FOOT_OFFSET;
    if (waveIndex === 0) {
      const skeletonX = clamp(rect.width - SKELETON_WIDTH - 48, 0, rect.width - SKELETON_WIDTH);
      return [createSkeleton({ x: skeletonX, y: skeletonY, facing: "left", now })];
    }
    if (waveIndex === 1) {
      const leftX = 0;
      const rightX = clamp(rect.width - SKELETON_WIDTH, 0, rect.width - SKELETON_WIDTH);
      return [
        createSkeleton({ x: leftX, y: skeletonY, facing: "right", now }),
        createSkeleton({ x: rightX, y: skeletonY, facing: "left", now }),
      ];
    }
    if (waveIndex === 2) {
      const leftX1 = 0;
      const leftX2 = clamp(MULTI_SPAWN_OFFSET, 0, rect.width - SKELETON_WIDTH);
      const rightX1 = clamp(rect.width - SKELETON_WIDTH, 0, rect.width - SKELETON_WIDTH);
      const rightX2 = clamp(rect.width - SKELETON_WIDTH - MULTI_SPAWN_OFFSET, 0, rect.width - SKELETON_WIDTH);
      return [
        createSkeleton({ x: leftX1, y: skeletonY, facing: "right", now }),
        createSkeleton({ x: leftX2, y: skeletonY, facing: "right", now }),
        createSkeleton({ x: rightX1, y: skeletonY, facing: "left", now }),
        createSkeleton({ x: rightX2, y: skeletonY, facing: "left", now }),
      ];
    }
    if (waveIndex === 3) {
      const wave3Offsets = Array.from({ length: WAVE_THREE_INITIAL_COUNT }, (_, index) => index);
      const leftXs = wave3Offsets.map((index) =>
        clamp(MULTI_SPAWN_OFFSET * index, 0, rect.width - SKELETON_WIDTH)
      );
      const rightXs = wave3Offsets.map((index) =>
        clamp(rect.width - SKELETON_WIDTH - MULTI_SPAWN_OFFSET * index, 0, rect.width - SKELETON_WIDTH)
      );
      return [
        ...leftXs.map((x) => createSkeleton({ x, y: skeletonY, facing: "right", now, wave3Initial: true })),
        ...rightXs.map((x) => createSkeleton({ x, y: skeletonY, facing: "left", now, wave3Initial: true })),
      ];
    }
    return [];
  };
  const spawnWaveThreeReinforcements = (rect, groundY, now) => {
    const skeletonY = groundY - SKELETON_HEIGHT + SKELETON_FOOT_OFFSET;
    const wave3Offsets = Array.from({ length: WAVE_THREE_REINFORCEMENT_COUNT }, (_, index) => index);
    const leftXs = wave3Offsets.map((index) =>
      -SKELETON_WIDTH - MULTI_SPAWN_OFFSET * index
    );
    const rightXs = wave3Offsets.map((index) =>
      rect.width + MULTI_SPAWN_OFFSET * index
    );
    return [
      ...leftXs.map((x) => createSkeleton({ x, y: skeletonY, facing: "right", now, wave3Reinforcement: true })),
      ...rightXs.map((x) => createSkeleton({ x, y: skeletonY, facing: "left", now, wave3Reinforcement: true })),
    ];
  };
  const spawnAceCutsceneSkeleton = (rect, groundY, now) => {
    const skeletonY = groundY - SKELETON_HEIGHT + SKELETON_FOOT_OFFSET;
    const spawnX = rect.width + SKELETON_WIDTH;
    return createSkeleton({
      x: spawnX,
      y: skeletonY,
      facing: "left",
      now,
      speedOverride: ACE_CUTSCENE_SKELETON_SPEED,
      noAttack: true,
    });
  };
  const createAce = ({ x, groundY, now }) => {
    const groundYPosition = groundY - ACE_HEIGHT + ACE_FOOT_OFFSET + ACE_GROUND_OFFSET;
    const fallStartY = ACE_FALL_START_Y;
    return {
      x,
      y: fallStartY,
      state: "fall",
      frame: 0,
      lastFrameTime: now,
      facing: "right",
      fallStartTime: now,
      fallStartY,
      hasHit: false,
      targetSide: "right",
      approachTargetX: null,
      dialogueStarted: false,
      dialogueComplete: false,
    };
  };

  // Position actors once container is measured
  useLayoutEffect(() => {
    const placeActors = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const now = performance.now();
      const minGroundY = Math.max(
        PLAYER_HEIGHT - PLAYER_FOOT_OFFSET,
        SKELETON_HEIGHT - SKELETON_FOOT_OFFSET
      );
      const maxGroundY = rect.height - Math.max(PLAYER_FOOT_OFFSET, SKELETON_FOOT_OFFSET);
      const groundY = clamp(rect.height * 0.58, minGroundY, maxGroundY);
      groundYRef.current = groundY;
      const playerY = groundY - PLAYER_HEIGHT + PLAYER_FOOT_OFFSET;
      const centeredX = clamp(rect.width / 2 - PLAYER_WIDTH / 2, 0, rect.width - PLAYER_WIDTH);
      const nextPlayerX = initialPlacementRef.current
        ? clamp(playerRef.current.x, 0, rect.width - PLAYER_WIDTH)
        : centeredX;
      const nextPlayer = { x: nextPlayerX, y: playerY };
      initialPlacementRef.current = true;
      playerRef.current = nextPlayer;
      setPlayer(nextPlayer);
      let nextSkeletons = skeletonsRef.current;
      if (nextSkeletons.length === 0) {
        skeletonIdRef.current = 0;
        nextSkeletons = spawnWave(0, rect, groundY, now);
        skeletonWaveRef.current = 0;
      } else {
        const skeletonY = groundY - SKELETON_HEIGHT + SKELETON_FOOT_OFFSET;
        nextSkeletons = nextSkeletons.map((skeleton) => ({
          ...skeleton,
          x: clampSkeletonX(skeleton.x, rect.width),
          y: skeletonY,
        }));
      }
      skeletonsRef.current = nextSkeletons;
      setSkeletons(nextSkeletons);
      if (aceRef.current) {
        const aceGroundY = groundY - ACE_HEIGHT + ACE_FOOT_OFFSET + ACE_GROUND_OFFSET;
        const nextAce = {
          ...aceRef.current,
          x: clamp(aceRef.current.x, 0, rect.width - ACE_WIDTH),
        };
        if (nextAce.state === "fall") {
          const fallProgress = Math.min(
            (now - nextAce.fallStartTime) / ACE_FALL_DURATION_MS,
            1
          );
          nextAce.fallStartY = ACE_FALL_START_Y;
          nextAce.y = nextAce.fallStartY + (aceGroundY - nextAce.fallStartY) * fallProgress;
        } else {
          nextAce.y = aceGroundY;
        }
        aceRef.current = nextAce;
        setAce(nextAce);
      }
    };
    placeActors();
    window.addEventListener("resize", placeActors);
    return () => window.removeEventListener("resize", placeActors);
  }, []);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);
  useEffect(() => {
    skeletonsRef.current = skeletons;
  }, [skeletons]);
  useEffect(() => {
    aceRef.current = ace;
  }, [ace]);
  useEffect(() => {
    aceDialogueRef.current = aceDialogueIndex;
  }, [aceDialogueIndex]);
  useEffect(() => {
    playerHeartsRef.current = playerHearts;
  }, [playerHearts]);
  const triggerAttack = () => {
    const cinematicLockActive = playerFearRef.current
      || aceExitRef.current
      || aceInterruptionRef.current.active
      || (aceRef.current && !aceRef.current.dialogueComplete);
    if (cinematicLockActive) {
      return;
    }
    if (
      attackRef.current.active ||
      playerHurtRef.current.active ||
      skeletonsRef.current.some((skeleton) => skeleton.attack.active) ||
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
    const cinematicLockActive = playerFearRef.current
      || aceExitRef.current
      || aceInterruptionRef.current.active
      || (aceRef.current && !aceRef.current.dialogueComplete);
    if (cinematicLockActive) {
      return;
    }
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
    const cinematicLockActive = playerFearRef.current
      || aceExitRef.current
      || aceInterruptionRef.current.active
      || (aceRef.current && !aceRef.current.dialogueComplete);
    if (cinematicLockActive) {
      return;
    }
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
    const playerX = clamp(rect.width / 2 - PLAYER_WIDTH / 2, 0, rect.width - PLAYER_WIDTH);
    const nextPlayer = {
      x: clamp(playerX, 0, rect.width - PLAYER_WIDTH),
      y: playerY,
    };
    skeletonIdRef.current = 0;
    const nextSkeletons = spawnWave(0, rect, groundY, now);
    skeletonWaveRef.current = 0;
    waveThreeStartRef.current = null;
    waveThreeReinforcedRef.current = false;
    aceInterruptionRef.current = {
      pendingSpawn: false,
      active: false,
      returnTargetX: null,
      resumeDialogueIndex: null,
    };
    aceExitRef.current = false;
    exitNavigationRef.current = false;
    aceRef.current = null;
    playerFearRef.current = false;
    setAceDialogueIndex(null);
    playerRef.current = nextPlayer;
    skeletonsRef.current = nextSkeletons;
    setPlayer(nextPlayer);
    setSkeletons(nextSkeletons);
    setAce(null);
    heldKeys.current.clear();
    runHold.current = { start: null, direction: 0 };
    facingRef.current = "right";
    initialPlacementRef.current = false;
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
    playerHeartsRef.current = MAX_HEARTS;
    setPlayerHearts(MAX_HEARTS);
  };

  useEffect(() => {
    const onDown = (e) => {
      if (e.code === "Space" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (!e.repeat && aceDialogueRef.current !== null) {
          if (aceDialogueRef.current === ACE_DIALOGUE_INTERRUPT_INDEX && !aceInterruptionRef.current.active) {
            aceInterruptionRef.current = {
              pendingSpawn: true,
              active: true,
              returnTargetX: null,
              resumeDialogueIndex: ACE_DIALOGUE_RESUME_INDEX,
            };
            setAceDialogueIndex(null);
            return;
          }
          if (aceDialogueRef.current === ACE_DIALOGUE_FOLLOW_INDEX) {
            setAceDialogueIndex(null);
            playerFearRef.current = false;
            aceExitRef.current = true;
            setAce((prev) => {
              if (!prev) return prev;
              const nextAce = { ...prev, dialogueComplete: true };
              aceRef.current = nextAce;
              return nextAce;
            });
            return;
          }
          if (aceDialogueRef.current < ACE_DIALOGUE_LINES.length - 1) {
            setAceDialogueIndex((prev) => (prev === null ? 0 : prev + 1));
          }
          return;
        }
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
      const isPlayerAttacking = attackRef.current.active;
      const playerHurt = playerHurtRef.current;
      const defend = defendRef.current;
      const jump = jumpRef.current;
      const rect = containerRef.current?.getBoundingClientRect();
      const currentPlayer = playerRef.current;
      const activeAce = aceRef.current;
      let playerMovedThisTick = false;
      const k = heldKeys.current;
      const movingLeft = k.has("a") || k.has("ArrowLeft");
      const movingRight = k.has("d") || k.has("ArrowRight");
      const moveXInput = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
      const exitActive = aceExitRef.current;
      const aceInterruptionActive = aceInterruptionRef.current.active;
      const aceCinematicActive = aceRef.current
        && (!aceRef.current.dialogueComplete || aceInterruptionActive || exitActive);
      const fearActive = playerFearRef.current;
      const cinematicProtectionActive = aceCinematicActive || fearActive;
      if (cinematicProtectionActive && playerHurt.active) {
        playerHurt.active = false;
        playerHurt.frame = 0;
        playerHurt.lockedPosition = null;
      }
      const playerLocked = isPlayerAttacking || playerHurt.active || defend.active || aceCinematicActive;
      let moveX = moveXInput;
      let isMoving = false;
      let runRamp = 0;
      let speed = WALK_SPEED;
      const aceFaceActive = aceRef.current
        && (aceDialogueRef.current !== null
          || aceRef.current.state === "approach"
          || aceInterruptionActive
          || skeletonsRef.current.some((skeleton) => skeleton.hearts > 0));
      if (exitActive) {
        facingRef.current = "right";
      } else if (aceFaceActive) {
        const aceCenterX = aceRef.current.x + ACE_WIDTH / 2;
        const playerCenterX = currentPlayer.x + PLAYER_WIDTH / 2;
        facingRef.current = aceCenterX > playerCenterX ? "right" : "left";
      }
      if (rect && rect.width > 0 && rect.height > 0) {
        const minGroundY = Math.max(
          PLAYER_HEIGHT - PLAYER_FOOT_OFFSET,
          SKELETON_HEIGHT - SKELETON_FOOT_OFFSET
        );
        const maxGroundY = rect.height - Math.max(PLAYER_FOOT_OFFSET, SKELETON_FOOT_OFFSET);
        const groundY = groundYRef.current !== null
          ? groundYRef.current
          : clamp(rect.height * 0.58, minGroundY, maxGroundY);
        if (groundYRef.current === null) {
          groundYRef.current = groundY;
        }
        const basePlayerY = groundY - PLAYER_HEIGHT + PLAYER_FOOT_OFFSET;
        let nextPlayerX = currentPlayer.x;
        let nextPlayerY = basePlayerY;
        if (exitActive && activeAce) {
          const followTargetX = activeAce.x - PLAYER_WIDTH - ACE_FOLLOW_GAP;
          const deltaToTarget = followTargetX - currentPlayer.x;
          moveX = deltaToTarget > 2 ? 1 : 0;
        } else if (fearActive) {
          const centerTargetX = clamp(
            rect.width / 2 - PLAYER_WIDTH / 2,
            0,
            rect.width - PLAYER_WIDTH
          );
          const deltaToCenter = centerTargetX - currentPlayer.x;
          if (Math.abs(deltaToCenter) <= 4) {
            moveX = 0;
          } else {
            moveX = deltaToCenter > 0 ? 1 : -1;
          }
        } else if (playerLocked) {
          moveX = 0;
        }
        isMoving = moveX !== 0 && (!playerLocked || fearActive || exitActive);
        if (!aceFaceActive && moveX !== 0 && (!playerLocked || fearActive || exitActive)) {
          facingRef.current = moveX < 0 ? "left" : "right";
        }
        if (exitActive) {
          runHold.current = { start: null, direction: 0 };
          runRamp = 0;
          speed = PLAYER_FOLLOW_SPEED;
        } else if (fearActive || playerLocked || moveX === 0) {
          runHold.current = { start: null, direction: 0 };
          runRamp = 0;
          speed = WALK_SPEED;
        } else if (runHold.current.start === null || runHold.current.direction !== moveX) {
          runHold.current = { start: now, direction: moveX };
        }
        if (!fearActive && !playerLocked) {
          const runHeldMs = runHold.current.start ? now - runHold.current.start : 0;
          runRamp = runHeldMs > RUN_TRIGGER_MS
            ? Math.min((runHeldMs - RUN_TRIGGER_MS) / RUN_RAMP_MS, 1)
            : 0;
          speed = WALK_SPEED + runRamp * (RUN_SPEED - WALK_SPEED);
        }
        if (!initialPlacementRef.current) {
          nextPlayerX = clamp(rect.width / 2 - PLAYER_WIDTH / 2, 0, rect.width - PLAYER_WIDTH);
          initialPlacementRef.current = true;
        }
        if (playerLocked && !fearActive && !exitActive) {
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
        let currentSkeletons = skeletonsRef.current;
        if (currentSkeletons.length === 0) {
          skeletonIdRef.current = 0;
          currentSkeletons = spawnWave(0, rect, groundY, now);
          skeletonWaveRef.current = 0;
        }
        if (aceInterruptionRef.current.pendingSpawn) {
          const cutsceneSkeleton = spawnAceCutsceneSkeleton(rect, groundY, now);
          currentSkeletons = [...currentSkeletons, cutsceneSkeleton];
          aceInterruptionRef.current.pendingSpawn = false;
          const playerBox = getPlayerHitbox(nextPlayerX);
          aceInterruptionRef.current.returnTargetX = clamp(
            playerBox.right + ACE_APPROACH_GAP - ACE_COLLISION_OFFSET,
            0,
            rect.width - ACE_WIDTH
          );
        }
        const aceApproachCrossing = activeAce
          && activeAce.state === "approach"
          && !activeAce.dialogueStarted;
        const aceCollisionEnabled = activeAce
          && activeAce.state !== "fall"
          && !currentSkeletons.some((skeleton) => skeleton.hearts > 0)
          && !aceApproachCrossing
          && !cinematicProtectionActive;
        if (!playerLocked && !cinematicProtectionActive) {
          currentSkeletons.forEach((skeleton) => {
            const skeletonDead = skeleton.death.active || skeleton.hearts <= 0;
            if (skeletonDead) return;
            const bodyGap = getBodyGap(nextPlayerX, nextPlayerY, skeleton.x, skeleton.y);
            if (bodyGap.overlapY && bodyGap.gap < COLLISION_GAP) {
              const skeletonBox = bodyGap.skeletonBox;
              if (nextPlayerX + PLAYER_WIDTH / 2 < skeleton.x + SKELETON_WIDTH / 2) {
                nextPlayerX = skeletonBox.left - COLLISION_GAP - PLAYER_BODY_OFFSET_X - PLAYER_BODY_WIDTH;
              } else {
                nextPlayerX = skeletonBox.right + COLLISION_GAP - PLAYER_BODY_OFFSET_X;
              }
            }
          });
        }
        if (aceCollisionEnabled) {
          const bodyGap = getAcePlayerBodyGap(nextPlayerX, nextPlayerY, activeAce.x, activeAce.y);
          if (bodyGap.overlapY && bodyGap.gap < COLLISION_GAP) {
            const aceBox = bodyGap.aceBox;
            if (nextPlayerX + PLAYER_WIDTH / 2 < activeAce.x + ACE_WIDTH / 2) {
              nextPlayerX = aceBox.left - COLLISION_GAP - PLAYER_BODY_OFFSET_X - PLAYER_BODY_WIDTH;
            } else {
              nextPlayerX = aceBox.right + COLLISION_GAP - PLAYER_BODY_OFFSET_X;
            }
          }
        }
        const nextPlayer = {
          x: clampPlayerX(nextPlayerX, rect.width, exitActive),
          y: clamp(nextPlayerY, 0, rect.height - PLAYER_HEIGHT),
        };
        let nextSkeletons = currentSkeletons.map((skeleton) => {
          const nextSkeleton = {
            ...skeleton,
            attack: { ...skeleton.attack },
            hurt: { ...skeleton.hurt },
            death: { ...skeleton.death },
            animation: { ...skeleton.animation },
          };
          const skeletonDead = nextSkeleton.death.active || nextSkeleton.hearts <= 0;
          const skeletonLocked = skeletonDead || nextSkeleton.attack.active || nextSkeleton.hurt.active;
          let nextSkeletonX = nextSkeleton.x;
          if (skeletonLocked) {
            if (nextSkeleton.attack.active && nextSkeleton.attack.lockedPosition) {
              nextSkeletonX = nextSkeleton.attack.lockedPosition.x;
            }
          } else {
            const bodyGap = getBodyGap(
              nextPlayer.x,
              nextPlayer.y,
              nextSkeleton.x,
              nextSkeleton.y
            );
            const attackGap = getGap(nextPlayer.x, nextSkeleton.x);
            const remainingDistance = (bodyGap.overlapY ? bodyGap.gap : attackGap) - COLLISION_GAP;
            if (remainingDistance > 0.5) {
              const direction = nextPlayer.x + PLAYER_WIDTH / 2 < nextSkeleton.x + SKELETON_WIDTH / 2 ? -1 : 1;
              const waveIndex = Math.max(skeletonWaveRef.current ?? 0, 0);
              const incrementalSpeed = SKELETON_SPEED + waveIndex * SKELETON_SPEED_INCREMENT;
              const baseSpeed = waveIndex === 3
                ? Math.max(incrementalSpeed, SKELETON_SPEED_WAVE_THREE)
                : incrementalSpeed;
              const skeletonSpeed = typeof nextSkeleton.speedOverride === "number"
                ? nextSkeleton.speedOverride
                : baseSpeed;
              const step = Math.min(remainingDistance, skeletonSpeed * dt);
              nextSkeletonX = nextSkeleton.x + direction * step;
            }
          }
          if (aceCollisionEnabled && !skeletonDead) {
            const gapToAce = getAceSkeletonGap(activeAce.x, nextSkeletonX);
            if (gapToAce < COLLISION_GAP) {
              const aceBox = getAceHitbox(activeAce.x);
              if (nextSkeletonX + SKELETON_WIDTH / 2 < activeAce.x + ACE_WIDTH / 2) {
                nextSkeletonX = aceBox.left - COLLISION_GAP - SKELETON_COLLISION_OFFSET - SKELETON_COLLISION_WIDTH;
              } else {
                nextSkeletonX = aceBox.right + COLLISION_GAP - SKELETON_COLLISION_OFFSET;
              }
            }
          }
          nextSkeleton.x = clampSkeletonX(nextSkeletonX, rect.width);
          const skeletonMoving = !skeletonLocked && Math.abs(nextSkeleton.x - skeleton.x) > 0.1;
          if (!nextSkeleton.attack.active && !nextSkeleton.hurt.active && !nextSkeleton.death.active) {
            const nextSkeletonAnimation = skeletonMoving ? "walk" : "idle";
            if (nextSkeleton.animation.name !== nextSkeletonAnimation) {
              nextSkeleton.animation = {
                name: nextSkeletonAnimation,
                frame: 0,
                lastFrameTime: now,
              };
            }
          }
          if (
            !skeletonDead
            && !nextSkeleton.attack.active
            && !nextSkeleton.hurt.active
            && !nextSkeleton.noAttack
            && !cinematicProtectionActive
          ) {
            const gapAfter = getGap(nextPlayer.x, nextSkeleton.x);
            if (gapAfter <= SKELETON_ATTACK_RANGE) {
              const timeSinceAttack = now - nextSkeleton.attack.lastAttackTime;
              if (timeSinceAttack >= SKELETON_ATTACK_COOLDOWN_MS) {
                const skeletonFacing = nextSkeleton.x + SKELETON_WIDTH / 2 > nextPlayer.x + PLAYER_WIDTH / 2
                  ? "left"
                  : "right";
                nextSkeleton.attack = {
                  ...nextSkeleton.attack,
                  active: true,
                  facing: skeletonFacing,
                  lockedPosition: { x: nextSkeleton.x, y: nextSkeleton.y },
                  lastAttackTime: now,
                  hasHit: false,
                };
                nextSkeleton.animation = {
                  name: "attack",
                  frame: 0,
                  lastFrameTime: now,
                };
              }
            }
          }
          return nextSkeleton;
        });
        if (!playerLocked && !cinematicProtectionActive) {
          nextSkeletons.forEach((skeleton) => {
            const skeletonDead = skeleton.death.active || skeleton.hearts <= 0;
            if (skeletonDead) return;
            const bodyGapAfter = getBodyGap(
              nextPlayer.x,
              nextPlayer.y,
              skeleton.x,
              skeleton.y
            );
            if (bodyGapAfter.overlapY && bodyGapAfter.gap < COLLISION_GAP) {
              const skeletonBox = bodyGapAfter.skeletonBox;
              if (nextPlayer.x + PLAYER_WIDTH / 2 < skeleton.x + SKELETON_WIDTH / 2) {
                nextPlayer.x = skeletonBox.left - COLLISION_GAP - PLAYER_BODY_OFFSET_X - PLAYER_BODY_WIDTH;
              } else {
                nextPlayer.x = skeletonBox.right + COLLISION_GAP - PLAYER_BODY_OFFSET_X;
              }
              nextPlayer.x = clampPlayerX(nextPlayer.x, rect.width, exitActive);
            }
          });
        }
        if (aceCollisionEnabled) {
          const bodyGapAfter = getAcePlayerBodyGap(nextPlayer.x, nextPlayer.y, activeAce.x, activeAce.y);
          if (bodyGapAfter.overlapY && bodyGapAfter.gap < COLLISION_GAP) {
            const aceBox = bodyGapAfter.aceBox;
            if (nextPlayer.x + PLAYER_WIDTH / 2 < activeAce.x + ACE_WIDTH / 2) {
              nextPlayer.x = aceBox.left - COLLISION_GAP - PLAYER_BODY_OFFSET_X - PLAYER_BODY_WIDTH;
            } else {
              nextPlayer.x = aceBox.right + COLLISION_GAP - PLAYER_BODY_OFFSET_X;
            }
            nextPlayer.x = clampPlayerX(nextPlayer.x, rect.width, exitActive);
          }
        }
        const playerImpact = PLAYER_ATTACK_IMPACT_FRAMES.has(attackRef.current.frame);
        if (attackRef.current.active && playerImpact && !attackRef.current.hasHit) {
          let targetIndex = -1;
          let bestGap = Number.POSITIVE_INFINITY;
          nextSkeletons.forEach((skeleton, index) => {
            const skeletonDead = skeleton.death.active || skeleton.hearts <= 0;
            if (skeletonDead || skeleton.hurt.active) return;
            const gapAfter = getGap(nextPlayer.x, skeleton.x);
            if (gapAfter <= MELEE_RANGE && gapAfter < bestGap) {
              bestGap = gapAfter;
              targetIndex = index;
            }
          });
          if (targetIndex !== -1) {
            const target = {
              ...nextSkeletons[targetIndex],
              attack: { ...nextSkeletons[targetIndex].attack },
              hurt: { ...nextSkeletons[targetIndex].hurt },
              death: { ...nextSkeletons[targetIndex].death },
              animation: { ...nextSkeletons[targetIndex].animation },
            };
            attackRef.current.hasHit = true;
            const nextSkeletonHearts = Math.max(0, target.hearts - 1);
            target.hearts = nextSkeletonHearts;
            const skeletonFacing = target.x + SKELETON_WIDTH / 2 > nextPlayer.x + PLAYER_WIDTH / 2 ? "left" : "right";
            if (nextSkeletonHearts <= 0) {
              target.death.active = true;
              target.death.frame = 0;
              target.death.lastFrameTime = now;
              target.death.facing = skeletonFacing;
              target.attack.active = false;
              target.attack.lockedPosition = null;
              target.attack.hasHit = false;
              target.hurt.active = false;
              target.animation = {
                name: "death",
                frame: 0,
                lastFrameTime: now,
              };
            } else {
              target.hurt.active = true;
              target.hurt.frame = 0;
              target.hurt.lastFrameTime = now;
              target.hurt.facing = skeletonFacing;
              target.attack.active = false;
              target.attack.lockedPosition = null;
              target.attack.hasHit = false;
            }
            nextSkeletons[targetIndex] = target;
          }
        }
        let didReset = false;
        nextSkeletons = nextSkeletons.map((skeleton) => {
          const nextSkeleton = {
            ...skeleton,
            attack: { ...skeleton.attack },
            hurt: { ...skeleton.hurt },
            death: { ...skeleton.death },
            animation: { ...skeleton.animation },
          };
          const skeletonDead = nextSkeleton.death.active || nextSkeleton.hearts <= 0;
          if (!skeletonDead && nextSkeleton.attack.active && !cinematicProtectionActive) {
            const gapAfter = getGap(nextPlayer.x, nextSkeleton.x);
            const inMelee = gapAfter <= MELEE_RANGE;
            const skeletonImpact = SKELETON_ATTACK_IMPACT_FRAMES.has(nextSkeleton.animation.frame);
            if (skeletonImpact && !nextSkeleton.attack.hasHit && inMelee) {
              if (defend.active) {
                nextSkeleton.attack.hasHit = true;
              } else if (!playerHurt.active) {
                nextSkeleton.attack.hasHit = true;
                const nextPlayerHearts = Math.max(0, playerHeartsRef.current - 1);
                playerHeartsRef.current = nextPlayerHearts;
                setPlayerHearts(nextPlayerHearts);
                if (nextPlayerHearts <= 0) {
                  didReset = true;
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
          }
          return nextSkeleton;
        });
        if (didReset) {
          resetScene(now);
          requestAnimationFrame(tick);
          return;
        }
        let nextAce = aceRef.current;
        if (
          !nextAce &&
          waveThreeStartRef.current !== null &&
          now - waveThreeStartRef.current >= ACE_SPAWN_DELAY_MS
        ) {
          const aceX = clamp(rect.width / 2 - ACE_WIDTH / 2, 0, rect.width - ACE_WIDTH);
          nextAce = createAce({ x: aceX, groundY, now });
        }
        if (nextAce) {
          let workingAce = { ...nextAce };
          const aceGroundY = groundY - ACE_HEIGHT + ACE_FOOT_OFFSET + ACE_GROUND_OFFSET;
          if (aceExitRef.current) {
            if (workingAce.state !== "exit") {
              workingAce = {
                ...workingAce,
                state: "exit",
                frame: 0,
                lastFrameTime: now,
              };
            }
            workingAce.y = aceGroundY;
            workingAce.x += ACE_EXIT_SPEED * dt;
            workingAce.facing = "right";
            const exitAdvance = advanceAceFrame(workingAce, now, true);
            workingAce = exitAdvance.ace;
          } else {
          const livingSkeletons = nextSkeletons.filter((skeleton) => skeleton.hearts > 0);
          const hasLivingSkeletons = livingSkeletons.length > 0;
          const aceCenter = workingAce.x + ACE_WIDTH / 2;
          const playerCenter = nextPlayer.x + PLAYER_WIDTH / 2;
          if (hasLivingSkeletons && workingAce.state === "idle" && aceInterruptionRef.current.active) {
            workingAce = {
              ...workingAce,
              state: "roll",
              frame: 0,
              lastFrameTime: now,
              hasHit: false,
              targetSide: "right",
            };
          }
          if (!hasLivingSkeletons && !workingAce.dialogueStarted && workingAce.state === "idle") {
            const playerBox = getPlayerHitbox(nextPlayer.x);
            const targetX = clamp(
              playerBox.right + ACE_APPROACH_GAP - ACE_COLLISION_OFFSET,
              0,
              rect.width - ACE_WIDTH
            );
            workingAce = {
              ...workingAce,
              state: "approach",
              frame: 0,
              lastFrameTime: now,
              approachTargetX: targetX,
            };
          }
          const pickNearestOnSide = (side) => {
            let nearest = null;
            let nearestDistance = Number.POSITIVE_INFINITY;
            livingSkeletons.forEach((skeleton) => {
              const skeletonCenter = skeleton.x + SKELETON_WIDTH / 2;
              if (side === "right" && skeletonCenter < aceCenter) return;
              if (side === "left" && skeletonCenter > aceCenter) return;
              const distance = Math.abs(skeletonCenter - aceCenter);
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = skeleton;
              }
            });
            return nearest;
          };
          let targetSkeleton = pickNearestOnSide(workingAce.targetSide);
          if (!targetSkeleton) {
            const fallbackSide = workingAce.targetSide === "right" ? "left" : "right";
            const fallbackTarget = pickNearestOnSide(fallbackSide);
            if (fallbackTarget) {
              workingAce.targetSide = fallbackSide;
              targetSkeleton = fallbackTarget;
            }
          }
          let blockTarget = null;
          let blockGap = Number.POSITIVE_INFINITY;
          nextSkeletons.forEach((skeleton) => {
            if (!skeleton.attack.active || skeleton.hearts <= 0) return;
            const gap = getAceSkeletonGap(workingAce.x, skeleton.x);
            if (gap < blockGap) {
              blockGap = gap;
              blockTarget = skeleton;
            }
          });
          const shouldBlock = blockTarget !== null && blockGap <= ACE_BLOCK_RANGE;
          if (workingAce.state === "fall") {
            const fallProgress = Math.min(
              (now - workingAce.fallStartTime) / ACE_FALL_DURATION_MS,
              1
            );
            workingAce.y = workingAce.fallStartY + (aceGroundY - workingAce.fallStartY) * fallProgress;
            const fallAdvance = advanceAceFrame(workingAce, now, false);
            workingAce = fallAdvance.ace;
            if (fallProgress >= 1) {
              workingAce = {
                ...workingAce,
                y: aceGroundY,
                state: "roll",
                frame: 0,
                lastFrameTime: now,
                hasHit: false,
              };
            }
          } else if (workingAce.state === "approach") {
            workingAce.y = aceGroundY;
            const targetX = workingAce.approachTargetX ?? workingAce.x;
            const delta = ACE_WALK_SPEED * dt;
            if (Math.abs(workingAce.x - targetX) <= 4) {
              workingAce.x = targetX;
              const faceDirection = playerCenter > workingAce.x + ACE_WIDTH / 2 ? "right" : "left";
              workingAce = {
                ...workingAce,
                state: "idle",
                frame: 0,
                lastFrameTime: now,
                dialogueStarted: true,
                facing: faceDirection,
              };
              if (aceDialogueRef.current === null) {
                setAceDialogueIndex(0);
              }
            } else if (workingAce.x < targetX) {
              workingAce.x = Math.min(workingAce.x + delta, targetX);
              workingAce.facing = "right";
            } else if (workingAce.x > targetX) {
              workingAce.x = Math.max(workingAce.x - delta, targetX);
              workingAce.facing = "left";
            }
            const approachAdvance = advanceAceFrame(workingAce, now, true);
            workingAce = approachAdvance.ace;
          } else if (workingAce.state === "block") {
            workingAce.y = aceGroundY;
            const blockAdvance = advanceAceFrame(workingAce, now, false);
            workingAce = blockAdvance.ace;
            if (blockAdvance.done) {
              workingAce = {
                ...workingAce,
                state: "attack",
                frame: 0,
                lastFrameTime: now,
                hasHit: false,
              };
            }
          } else if (workingAce.state === "attack") {
            workingAce.y = aceGroundY;
            const attackAdvance = advanceAceFrame(workingAce, now, false);
            workingAce = attackAdvance.ace;
            if (ACE_ATTACK_IMPACT_FRAMES.has(workingAce.frame) && !workingAce.hasHit) {
              workingAce.hasHit = true;
              nextSkeletons = nextSkeletons.map((skeleton) => {
                if (skeleton.hearts <= 0) return skeleton;
                const gap = getAceSkeletonGap(workingAce.x, skeleton.x);
                if (gap > ACE_ATTACK_RANGE) return skeleton;
                const facing = skeleton.x + SKELETON_WIDTH / 2 > workingAce.x + ACE_WIDTH / 2
                  ? "left"
                  : "right";
                return markSkeletonDead(skeleton, now, facing);
              });
            }
            if (attackAdvance.done) {
              const hasTargets = nextSkeletons.some((skeleton) => skeleton.hearts > 0);
              const shouldReturn = aceInterruptionRef.current.active
                && !hasTargets
                && aceInterruptionRef.current.returnTargetX !== null;
              workingAce = {
                ...workingAce,
                state: hasTargets || shouldReturn ? "roll" : "idle",
                frame: 0,
                lastFrameTime: now,
                hasHit: false,
                targetSide: workingAce.targetSide === "right" ? "left" : "right",
              };
            }
          } else {
            if (shouldBlock) {
              workingAce = {
                ...workingAce,
                y: aceGroundY,
                state: "block",
                frame: 0,
                lastFrameTime: now,
                facing: blockTarget.x + SKELETON_WIDTH / 2 > workingAce.x + ACE_WIDTH / 2 ? "right" : "left",
                hasHit: false,
              };
            } else if (workingAce.state === "roll") {
              const returnTargetX = aceInterruptionRef.current.returnTargetX;
              if (returnTargetX !== null && !targetSkeleton) {
                const delta = ACE_ROLL_SPEED * dt;
                if (Math.abs(workingAce.x - returnTargetX) <= 4) {
                  workingAce.x = returnTargetX;
                  workingAce = {
                    ...workingAce,
                    y: aceGroundY,
                    state: "idle",
                    frame: 0,
                    lastFrameTime: now,
                  };
                  aceInterruptionRef.current.active = false;
                  aceInterruptionRef.current.returnTargetX = null;
                  if (
                    aceDialogueRef.current === null
                    && aceInterruptionRef.current.resumeDialogueIndex !== null
                  ) {
                    setAceDialogueIndex(aceInterruptionRef.current.resumeDialogueIndex);
                  }
                  aceInterruptionRef.current.resumeDialogueIndex = null;
                } else if (workingAce.x < returnTargetX) {
                  workingAce.x = Math.min(workingAce.x + delta, returnTargetX);
                  workingAce.facing = "right";
                } else if (workingAce.x > returnTargetX) {
                  workingAce.x = Math.max(workingAce.x - delta, returnTargetX);
                  workingAce.facing = "left";
                }
                workingAce.y = aceGroundY;
                const rollAdvance = advanceAceFrame(workingAce, now, true);
                workingAce = rollAdvance.ace;
              } else if (!targetSkeleton) {
                workingAce = {
                  ...workingAce,
                  y: aceGroundY,
                  state: "idle",
                  frame: 0,
                  lastFrameTime: now,
                };
              } else {
                const targetX = clamp(
                  targetSkeleton.x - ACE_WIDTH * 0.2,
                  0,
                  rect.width - ACE_WIDTH
                );
                const delta = ACE_ROLL_SPEED * dt;
                if (workingAce.x < targetX) {
                  workingAce.x = Math.min(workingAce.x + delta, targetX);
                  workingAce.facing = "right";
                } else if (workingAce.x > targetX) {
                  workingAce.x = Math.max(workingAce.x - delta, targetX);
                  workingAce.facing = "left";
                }
                workingAce.y = aceGroundY;
                const rollAdvance = advanceAceFrame(workingAce, now, true);
                workingAce = rollAdvance.ace;
                const gap = getAceSkeletonGap(workingAce.x, targetSkeleton.x);
                if (gap <= ACE_ATTACK_RANGE) {
                  workingAce = {
                    ...workingAce,
                    state: "attack",
                    frame: 0,
                    lastFrameTime: now,
                    hasHit: false,
                  };
                }
              }
            } else {
              workingAce.y = aceGroundY;
              const idleAdvance = advanceAceFrame(workingAce, now, true);
              workingAce = idleAdvance.ace;
            }
          }
          const aceApproachCrossing = workingAce.state === "approach" && !workingAce.dialogueStarted;
          const aceCollisionEnabledDuringAce = workingAce.state !== "fall"
            && !hasLivingSkeletons
            && !aceApproachCrossing
            && !cinematicProtectionActive;
          if (aceCollisionEnabledDuringAce) {
            const bodyGap = getAcePlayerBodyGap(nextPlayer.x, nextPlayer.y, workingAce.x, workingAce.y);
            if (bodyGap.overlapY && bodyGap.gap < COLLISION_GAP) {
              const playerBox = bodyGap.playerBox;
              if (workingAce.x + ACE_WIDTH / 2 < nextPlayer.x + PLAYER_WIDTH / 2) {
                workingAce.x = playerBox.left - COLLISION_GAP - ACE_BODY_OFFSET_X - ACE_BODY_WIDTH;
              } else {
                workingAce.x = playerBox.right + COLLISION_GAP - ACE_BODY_OFFSET_X;
              }
              workingAce.x = clamp(workingAce.x, 0, rect.width - ACE_WIDTH);
            }
            if (workingAce.state === "roll" || workingAce.state === "approach") {
              livingSkeletons.forEach((skeleton) => {
                const gapToSkeleton = getAceSkeletonGap(workingAce.x, skeleton.x);
                if (gapToSkeleton < COLLISION_GAP) {
                  const skeletonBox = getSkeletonHitbox(skeleton.x);
                  if (workingAce.x + ACE_WIDTH / 2 < skeleton.x + SKELETON_WIDTH / 2) {
                    workingAce.x = skeletonBox.left - COLLISION_GAP - ACE_COLLISION_OFFSET - ACE_COLLISION_WIDTH;
                  } else {
                    workingAce.x = skeletonBox.right + COLLISION_GAP - ACE_COLLISION_OFFSET;
                  }
                  workingAce.x = clamp(workingAce.x, 0, rect.width - ACE_WIDTH);
                }
              });
            }
          }
          }
          nextAce = workingAce;
        }
        nextSkeletons = nextSkeletons.map((skeleton) => {
          const nextSkeleton = {
            ...skeleton,
            attack: { ...skeleton.attack },
            hurt: { ...skeleton.hurt },
            death: { ...skeleton.death },
            animation: { ...skeleton.animation },
          };
          if (nextSkeleton.death.active) {
            const deathSprite = SKELETON_SPRITES.death;
            const deathFrameDuration = 1000 / deathSprite.fps;
            if (now - nextSkeleton.death.lastFrameTime >= deathFrameDuration) {
              const framesToAdvance = Math.floor((now - nextSkeleton.death.lastFrameTime) / deathFrameDuration);
              const nextFrame = nextSkeleton.death.frame + framesToAdvance;
              if (nextFrame >= deathSprite.frames) {
                nextSkeleton.death.frame = deathSprite.frames - 1;
                nextSkeleton.death.lastFrameTime = now;
              } else {
                nextSkeleton.death.frame = nextFrame;
                nextSkeleton.death.lastFrameTime += framesToAdvance * deathFrameDuration;
              }
            }
          } else if (nextSkeleton.hurt.active) {
            const hurtSprite = SKELETON_SPRITES.hurt;
            const hurtFrameDuration = 1000 / hurtSprite.fps;
            if (now - nextSkeleton.hurt.lastFrameTime >= hurtFrameDuration) {
              const framesToAdvance = Math.floor((now - nextSkeleton.hurt.lastFrameTime) / hurtFrameDuration);
              const nextFrame = nextSkeleton.hurt.frame + framesToAdvance;
              if (nextFrame >= hurtSprite.frames) {
                nextSkeleton.hurt.active = false;
                nextSkeleton.hurt.frame = 0;
                nextSkeleton.hurt.lastFrameTime = now;
                nextSkeleton.animation = {
                  name: "idle",
                  frame: 0,
                  lastFrameTime: now,
                };
              } else {
                nextSkeleton.hurt.frame = nextFrame;
                nextSkeleton.hurt.lastFrameTime += framesToAdvance * hurtFrameDuration;
              }
            }
          } else if (nextSkeleton.attack.active) {
            const attackSprite = SKELETON_SPRITES.attack;
            const attackFrameDuration = 1000 / attackSprite.fps;
            if (now - nextSkeleton.animation.lastFrameTime >= attackFrameDuration) {
              const framesToAdvance = Math.floor((now - nextSkeleton.animation.lastFrameTime) / attackFrameDuration);
              const nextFrame = nextSkeleton.animation.frame + framesToAdvance;
              if (nextFrame >= attackSprite.frames) {
                nextSkeleton.attack.active = false;
                nextSkeleton.attack.lockedPosition = null;
                nextSkeleton.attack.hasHit = false;
                nextSkeleton.animation = {
                  name: "idle",
                  frame: 0,
                  lastFrameTime: now,
                };
              } else {
                nextSkeleton.animation.frame = nextFrame;
                nextSkeleton.animation.lastFrameTime += framesToAdvance * attackFrameDuration;
              }
            }
          } else {
            const skeletonSprite = SKELETON_SPRITES[nextSkeleton.animation.name];
            const skeletonFrameDuration = 1000 / skeletonSprite.fps;
            if (now - nextSkeleton.animation.lastFrameTime >= skeletonFrameDuration) {
              const framesToAdvance = Math.floor((now - nextSkeleton.animation.lastFrameTime) / skeletonFrameDuration);
              nextSkeleton.animation.frame = (nextSkeleton.animation.frame + framesToAdvance) % skeletonSprite.frames;
              nextSkeleton.animation.lastFrameTime += framesToAdvance * skeletonFrameDuration;
            }
          }
          return nextSkeleton;
        });
        if (skeletonWaveRef.current === 3 && !waveThreeReinforcedRef.current) {
          const initialSkeletons = nextSkeletons.filter((skeleton) => skeleton.wave3Initial);
          const movedEnough = initialSkeletons.length > 0
            && initialSkeletons.every(
              (skeleton) => Math.abs(skeleton.x - skeleton.spawnX) >= WAVE_THREE_REINFORCEMENT_DISTANCE
            );
          const delayElapsed = waveThreeStartRef.current !== null
            && now - waveThreeStartRef.current >= WAVE_THREE_REINFORCEMENT_DELAY_MS;
          if (movedEnough || delayElapsed) {
            const reinforcements = spawnWaveThreeReinforcements(rect, groundY, now);
            nextSkeletons = [...nextSkeletons, ...reinforcements];
            waveThreeReinforcedRef.current = true;
          }
        }
        const deathFrameMax = SKELETON_SPRITES.death.frames - 1;
        const waveCleared = nextSkeletons.length > 0
          && nextSkeletons.every(
            (skeleton) => skeleton.hearts <= 0
              && (!skeleton.death.active || skeleton.death.frame >= deathFrameMax)
          );
        if (waveCleared && skeletonWaveRef.current < 3) {
          const nextWave = skeletonWaveRef.current + 1;
          const nextWaveSkeletons = spawnWave(nextWave, rect, groundY, now);
          skeletonWaveRef.current = nextWave;
          if (nextWave === 3) {
            waveThreeStartRef.current = now;
            waveThreeReinforcedRef.current = false;
            playerFearRef.current = true;
            heldKeys.current.clear();
            runHold.current = { start: null, direction: 0 };
            attackRef.current.active = false;
            attackRef.current.lockedPosition = null;
            attackRef.current.hasHit = false;
            defendRef.current.active = false;
            defendRef.current.lockedPosition = null;
          }
          nextSkeletons = nextWaveSkeletons;
        }
        if (
          exitActive
          && nextAce
          && !exitNavigationRef.current
          && nextAce.x > rect.width
          && nextPlayer.x > rect.width
        ) {
          exitNavigationRef.current = true;
          navigate("/dashboard/main", { replace: true });
          return;
        }
        playerMovedThisTick = Math.abs(nextPlayer.x - currentPlayer.x) > 0.2
          || Math.abs(nextPlayer.y - currentPlayer.y) > 0.2;
        playerRef.current = nextPlayer;
        setPlayer(nextPlayer);
        skeletonsRef.current = nextSkeletons;
        setSkeletons(nextSkeletons);
        aceRef.current = nextAce;
        setAce(nextAce);
      }
      if (!playerHurt.active) {
        const animationMoving = playerMovedThisTick;
        const nextAnimation = jump.active
          ? "jump"
          : (animationMoving ? (runRamp > 0 ? "run" : "walk") : "idle");
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
      requestAnimationFrame(tick);
    };
    lastTick.current = performance.now();
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const playerCenterX = player.x + PLAYER_WIDTH / 2;
  const playerCenterY = player.y + PLAYER_HEIGHT / 2;
  const handleArenaMouseDown = (event) => {
    const target = event.target;
    if (event.button === 2) {
      event.preventDefault();
      triggerDefend();
      return;
    }
    if (event.button !== 0) return;
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
  const skeletonViews = skeletons.map((skeleton) => {
    const isSkeletonHurt = skeleton.hurt.active;
    const isSkeletonAttacking = skeleton.attack.active;
    const isSkeletonDead = skeleton.death.active;
    const skeletonSprite = isSkeletonDead
      ? SKELETON_SPRITES.death
      : (isSkeletonHurt
        ? SKELETON_SPRITES.hurt
        : (isSkeletonAttacking ? SKELETON_SPRITES.attack : SKELETON_SPRITES[skeleton.animation.name]));
    const skeletonFrameIndex = isSkeletonDead
      ? skeleton.death.frame
      : (isSkeletonHurt ? skeleton.hurt.frame : skeleton.animation.frame);
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
      ? skeleton.death.facing
      : (isSkeletonHurt
        ? skeleton.hurt.facing
        : (isSkeletonAttacking
          ? skeleton.attack.facing
          : (skeleton.x + SKELETON_WIDTH / 2 > player.x + PLAYER_WIDTH / 2 ? "left" : "right")));
    const skeletonClassName = `wg-character wg-skeleton${skeletonFacing === "left" ? " wg-character--left" : ""}`;
    return (
      <div
        key={skeleton.id}
        className={skeletonClassName}
        style={skeletonStyle}
      />
    );
  });
  const aceSprite = ace ? ACE_SPRITES[ace.state] : null;
  const aceFrameSrc = aceSprite ? aceSprite.frames[ace.frame] : null;
  const aceStyle = ace
    ? {
      left: ace.x,
      top: ace.y,
      width: ACE_WIDTH,
      height: ACE_HEIGHT,
      backgroundImage: `url(${aceFrameSrc})`,
      backgroundSize: "100% 100%",
    }
    : null;
  const aceClassName = ace
    ? `wg-character wg-ace${ace.facing === "left" ? " wg-character--left" : ""}`
    : "";
  const aceDialogueLine = aceDialogueIndex !== null
    ? ACE_DIALOGUE_LINES[aceDialogueIndex]
    : null;

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
        {skeletonViews}
        {ace && (
          <div
            className={aceClassName}
            style={aceStyle}
          />
        )}
        {aceDialogueLine && (
          <div className="wg-dialogue" role="dialog" aria-live="polite">
            <div className="wg-dialogue__portrait">
              <img className="wg-dialogue__portrait-img" src={aceHead} alt="Ace" />
            </div>
            <div className="wg-dialogue__text">{aceDialogueLine}</div>
          </div>
        )}
      </div>
    </div>
  );
}
