/**
 * InteractiveCoinHero — Cinematic Full-Screen Video Background
 *
 * SEAMLESS LOOP: Dual-video crossfade system. Two identical <video> elements
 * trade off — when video A approaches its end (~1.5s before), video B starts
 * from 0 and fades in. The handoff is opacity-based so the loop seam is
 * imperceptible (<50ms visual gap). A continuous slow CSS drift animation
 * runs on the wrapper so even during the crossfade instant, motion persists.
 *
 * PARALLAX: All interaction is pure-DOM (refs + rAF lerp). Zero React
 * re-renders during animation. Scroll and mouse inputs are damped through
 * a lerp factor of 0.06 for buttery 60fps motion.
 *
 * LAYERS (bottom → top):
 *   0  Dark base (#030a07)
 *   1  Video pair (crossfaded) — heavily color-graded
 *   2  Coin-focus glow — radial bloom, moves faster than video (depth)
 *   3  Vignette — heavy edge darkening
 *   4  Color-grade overlay — green/teal multiply blend
 *   5  Readability gradient — directional darken for text contrast
 *   6  Film grain — SVG noise at 3%
 *   7  Ambient drift — continuous slow CSS animation (never stops)
 */

import React, { useRef, useEffect, useCallback } from 'react';

// ─── Utilities ─────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ─── Tuning Constants ──────────────────────────────────────────────────────
const BASE_PLAYBACK_RATE     = 0.85;
const SCROLL_SPEED_BOOST     = 0.12;    // +playbackRate at max scroll
const SCROLL_PARALLAX_PX     = 0.07;    // px shift per scroll-pixel
const SCROLL_SCALE_DROP      = 0.00003; // scale decrease per scroll-pixel
const MOUSE_SHIFT_PX         = 15;      // ±px from mouse X
const MOUSE_TILT_DEG         = 3.5;     // ±deg rotateY from mouse X
const LERP_FACTOR            = 0.055;   // damping (lower = smoother)
const MAX_SCROLL              = 1400;
const CROSSFADE_LEAD_SEC     = 1.8;     // seconds before end to start crossfade
const CROSSFADE_DURATION_SEC = 1.2;     // duration of the opacity ramp

export const InteractiveCoinHero: React.FC = () => {
  // ── Refs ────────────────────────────────────────────────────────────────
  const videoA   = useRef<HTMLVideoElement>(null);
  const videoB   = useRef<HTMLVideoElement>(null);
  const wrapA    = useRef<HTMLDivElement>(null);
  const wrapB    = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);  // parallax wrapper
  const glowRef  = useRef<HTMLDivElement>(null);

  // ── Parallax state (no React state — pure refs for 0 re-renders) ────────
  const tgt = useRef({ scrollY: 0, mouseX: 0, mouseY: 0 });
  const cur = useRef({ scrollY: 0, mouseX: 0, mouseY: 0 });
  const raf = useRef(0);

  // ── Crossfade state ─────────────────────────────────────────────────────
  const activeSlot = useRef<'A' | 'B'>('A');
  const crossfading = useRef(false);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const getActive  = () => activeSlot.current === 'A' ? videoA.current : videoB.current;
  const getStandby = () => activeSlot.current === 'A' ? videoB.current : videoA.current;
  const getActiveWrap  = () => activeSlot.current === 'A' ? wrapA.current : wrapB.current;
  const getStandbyWrap = () => activeSlot.current === 'A' ? wrapB.current : wrapA.current;

  // ── Crossfade logic (called from timeupdate) ─────────────────────────────
  const checkCrossfade = useCallback(() => {
    const active = getActive();
    const standby = getStandby();
    const aWrap = getActiveWrap();
    const sWrap = getStandbyWrap();
    if (!active || !standby || !aWrap || !sWrap) return;
    if (crossfading.current) return;

    const remaining = active.duration - active.currentTime;
    if (!isFinite(remaining) || remaining > CROSSFADE_LEAD_SEC) return;

    // ── Begin crossfade ─────────────────────────────────────────────────
    crossfading.current = true;

    // Prepare standby: reset to start, match playback rate, begin playing
    standby.currentTime = 0;
    standby.playbackRate = active.playbackRate;
    standby.play().catch(() => {});

    // Ramp standby opacity 0→1, active 1→0 over CROSSFADE_DURATION_SEC
    sWrap.style.transition = `opacity ${CROSSFADE_DURATION_SEC}s ease-in-out`;
    aWrap.style.transition = `opacity ${CROSSFADE_DURATION_SEC}s ease-in-out`;
    // Force reflow so the transition property takes effect
    void sWrap.offsetHeight;

    sWrap.style.opacity = '1';
    aWrap.style.opacity = '0';

    // After crossfade completes, swap roles
    setTimeout(() => {
      activeSlot.current = activeSlot.current === 'A' ? 'B' : 'A';
      crossfading.current = false;

      // Pause the now-hidden video to save resources
      const oldActive = activeSlot.current === 'A' ? videoB.current : videoA.current;
      if (oldActive) {
        oldActive.pause();
        oldActive.currentTime = 0;
      }
      // Remove transitions so next frame is instant
      aWrap.style.transition = '';
      sWrap.style.transition = '';
    }, CROSSFADE_DURATION_SEC * 1000 + 100);
  }, []);

  // ── Event handlers ──────────────────────────────────────────────────────
  const onScroll = useCallback(() => {
    tgt.current.scrollY = clamp(window.scrollY, 0, MAX_SCROLL);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    tgt.current.mouseX = (e.clientX / window.innerWidth  - 0.5) * 2; // -1…1
    tgt.current.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, []);

  // ── rAF animation loop ─────────────────────────────────────────────────
  const tick = useCallback(() => {
    const c = cur.current;
    const t = tgt.current;

    c.scrollY = lerp(c.scrollY, t.scrollY, LERP_FACTOR);
    c.mouseX  = lerp(c.mouseX,  t.mouseX,  LERP_FACTOR);
    c.mouseY  = lerp(c.mouseY,  t.mouseY,  LERP_FACTOR);

    const scrollNorm = c.scrollY / MAX_SCROLL; // 0…1
    const ty  = c.scrollY * SCROLL_PARALLAX_PX;
    const sc  = 1.08 - c.scrollY * SCROLL_SCALE_DROP;
    const mx  = c.mouseX * MOUSE_SHIFT_PX;
    const my  = c.mouseY * (MOUSE_SHIFT_PX * 0.4);
    const ry  = c.mouseX * MOUSE_TILT_DEG;
    const rx  = -c.mouseY * (MOUSE_TILT_DEG * 0.5);

    // Video layer parallax
    if (layerRef.current) {
      layerRef.current.style.transform =
        `translate3d(${mx.toFixed(1)}px, ${(ty + my).toFixed(1)}px, 0)` +
        ` scale(${sc.toFixed(4)})` +
        ` rotateY(${ry.toFixed(2)}deg)` +
        ` rotateX(${rx.toFixed(2)}deg)`;
    }

    // Glow layer — moves 1.5× more than video for depth separation
    if (glowRef.current) {
      const gx = c.mouseX * MOUSE_SHIFT_PX * 1.5;
      const gy = ty * 1.3 + c.mouseY * MOUSE_SHIFT_PX * 0.6;
      glowRef.current.style.transform =
        `translate(-50%, -50%) translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
      glowRef.current.style.opacity = `${Math.max(0.12, 0.45 - scrollNorm * 0.3).toFixed(2)}`;
    }

    // Playback rate — speeds up as user scrolls down
    const active = getActive();
    if (active) {
      const rate = BASE_PLAYBACK_RATE + scrollNorm * SCROLL_SPEED_BOOST;
      if (Math.abs(active.playbackRate - rate) > 0.015) {
        active.playbackRate = rate;
      }
    }

    raf.current = requestAnimationFrame(tick);
  }, []);

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Start video A as the active player
    const a = videoA.current;
    const b = videoB.current;
    if (a) {
      a.playbackRate = BASE_PLAYBACK_RATE;
      a.play().catch(() => {});
    }
    // Pre-load video B so it's ready for crossfade with zero delay
    if (b) {
      b.preload = 'auto';
      b.load();
    }
    // Set initial opacities
    if (wrapA.current) wrapA.current.style.opacity = '1';
    if (wrapB.current) wrapB.current.style.opacity = '0';

    // Attach crossfade checker to both videos' timeupdate
    const handler = () => checkCrossfade();
    if (a) a.addEventListener('timeupdate', handler);
    if (b) b.addEventListener('timeupdate', handler);

    // Attach scroll/mouse listeners + start rAF
    window.addEventListener('scroll',    onScroll,    { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    raf.current = requestAnimationFrame(tick);

    return () => {
      if (a) a.removeEventListener('timeupdate', handler);
      if (b) b.removeEventListener('timeupdate', handler);
      window.removeEventListener('scroll',    onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(raf.current);
    };
  }, [checkCrossfade, onScroll, onMouseMove, tick]);

  // ── Shared video element styles ─────────────────────────────────────────
  const videoStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center center',
  };

  const videoWrapStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        background: '#030a07',
        perspective: '1400px',
        perspectiveOrigin: '50% 50%',
      }}
      aria-hidden="true"
    >
      {/* ── Parallax wrapper (scroll + mouse driven) ────────────────── */}
      <div
        ref={layerRef}
        style={{
          position: 'absolute',
          /* Oversized so parallax/tilt never reveals edges */
          top: '-10%',
          left: '-10%',
          width: '120%',
          height: '120%',
          willChange: 'transform',
          transformOrigin: 'center center',
          transformStyle: 'preserve-3d',
          /*
           * Color grading (all videos inherit this):
           *   brightness 0.35 → heavy darken for text readability
           *   contrast 1.30   → punch up coin metallic highlights
           *   saturate 0.65   → desaturate gold so it won't overpower
           *   hue-rotate 15deg→ shift toward green / teal (Algorand)
           */
          filter: 'brightness(0.35) contrast(1.30) saturate(0.65) hue-rotate(15deg)',
          /* Continuous slow drift so motion never fully stops */
          animation: 'hero-drift 25s ease-in-out infinite alternate',
        }}
      >
        {/* Video A */}
        <div ref={wrapA} style={{ ...videoWrapStyle, opacity: 1 }}>
          <video
            ref={videoA}
            muted
            playsInline
            preload="auto"
            style={videoStyle}
          >
            <source src="/coin-video.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Video B (standby for seamless crossfade) */}
        <div ref={wrapB} style={{ ...videoWrapStyle, opacity: 0 }}>
          <video
            ref={videoB}
            muted
            playsInline
            preload="auto"
            style={videoStyle}
          >
            <source src="/coin-video.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      {/* ── Coin-Focus Glow (Layer 2) ──────────────────────────────── */}
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          top: '46%',
          left: '50%',
          width: '50vmin',
          height: '50vmin',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0,224,138,0.07) 0%, rgba(212,168,67,0.05) 35%, transparent 70%)',
          filter: 'blur(55px)',
          pointerEvents: 'none',
          opacity: 0.45,
          willChange: 'transform, opacity',
          animation: 'glow-breathe 6s ease-in-out infinite',
        }}
      />

      {/* ── Heavy Vignette (Layer 3) ───────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(
            ellipse 68% 62% at 50% 44%,
            transparent 0%,
            rgba(3,10,7,0.20) 50%,
            rgba(3,10,7,0.65) 78%,
            rgba(3,10,7,0.93) 100%
          )`,
        }}
      />

      {/* ── Green/Teal Color Grade (Layer 4) ───────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(160deg, rgba(0,224,138,0.05) 0%, rgba(0,80,55,0.07) 50%, rgba(3,10,7,0.10) 100%)',
          mixBlendMode: 'multiply',
        }}
      />

      {/* ── Readability Gradient (Layer 5) ─────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            linear-gradient(180deg,
              rgba(3,10,7,0.50) 0%,
              rgba(3,10,7,0.12) 28%,
              rgba(3,10,7,0.08) 48%,
              rgba(3,10,7,0.25) 72%,
              rgba(3,10,7,0.72) 100%
            ),
            linear-gradient(90deg,
              rgba(3,10,7,0.45) 0%,
              transparent 38%,
              transparent 68%,
              rgba(3,10,7,0.30) 100%
            )
          `,
        }}
      />

      {/* ── Film Grain (Layer 6) ───────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
          animation: 'grain-shift 8s steps(10) infinite',
        }}
      />

      {/* ── Keyframe animations ────────────────────────────────────── */}
      <style>{`
        @keyframes hero-drift {
          0%   { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(-6px, -4px, 0) scale(1.008); }
        }
        @keyframes glow-breathe {
          0%, 100% { opacity: 0.35; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 0.55; transform: translate(-50%, -50%) scale(1.06); }
        }
        @keyframes grain-shift {
          0%   { background-position: 0 0; }
          100% { background-position: 180px 180px; }
        }
      `}</style>
    </div>
  );
};
