/**
 * Motion System — Scroll & Micro-Interaction Primitives
 *
 * Architecture:
 *   Layer 2 — UI Interaction (Framer Motion)
 *   Handles: scroll reveals, micro-interactions, count-up, modals.
 *   Does NOT drive 3D scene or continuous loops.
 *
 * Easing philosophy:
 *   - Predictable, linear-adjacent curves
 *   - No spring / bounce
 *   - Durations 0.35–0.6s for reveals, 0.15–0.25s for micro
 */

import React, {
  useRef,
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
} from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  useSpring,
  type Variants,
  type Transition,
} from 'motion/react';

// ─── TIMING CONSTANTS ────────────────────────────────────────
export const EASE_REVEAL: [number, number, number, number] = [0.25, 0.1, 0.25, 1]; // CSS ease
export const EASE_MICRO: [number, number, number, number] = [0.22, 0.0, 0.36, 1]; // subtle out
export const DURATION_REVEAL = 0.55;
export const DURATION_MICRO = 0.2;
export const STAGGER_CHILDREN = 0.08;

// ─── SCROLL REVEAL VARIANTS ─────────────────────────────────
const revealFromLeft: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0 },
};
const revealFromRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0 },
};
const revealFadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};
const revealScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

const transitionReveal: Transition = {
  duration: DURATION_REVEAL,
  ease: EASE_REVEAL,
};

// ─── ScrollReveal ────────────────────────────────────────────
type RevealDirection = 'left' | 'right' | 'up' | 'scale';

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: RevealDirection;
  delay?: number;
  className?: string;
  once?: boolean;
}

const variantMap: Record<RevealDirection, Variants> = {
  left: revealFromLeft,
  right: revealFromRight,
  up: revealFadeUp,
  scale: revealScale,
};

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  className,
  once = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      variants={variantMap[direction]}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      transition={{ ...transitionReveal, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── AlternatingReveal (left/right blocks) ───────────────────
interface AlternatingRevealProps {
  children: React.ReactNode[];
  className?: string;
}

export const AlternatingReveal: React.FC<AlternatingRevealProps> = ({
  children,
  className,
}) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => (
        <ScrollReveal
          direction={i % 2 === 0 ? 'left' : 'right'}
          delay={i * STAGGER_CHILDREN}
        >
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
};

// ─── StaggerContainer / StaggerItem ─────────────────────────
const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_CHILDREN } },
};
const staggerItemVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitionReveal },
};

export const StaggerContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <motion.div variants={staggerItemVariant} className={className}>
    {children}
  </motion.div>
);

// ─── CountUp ─────────────────────────────────────────────────
export const CountUp: React.FC<{
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}> = ({ to, duration = 1.4, decimals = 0, prefix = '', suffix = '', className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, {
    damping: 40,
    stiffness: 80,
    mass: 1,
  });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (isInView) motionVal.set(to);
  }, [isInView, to, motionVal]);

  useEffect(() => {
    const unsub = springVal.on('change', (v) => {
      setDisplay(v.toFixed(decimals));
    });
    return unsub;
  }, [springVal, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

// ─── Micro-Interaction Wrappers ──────────────────────────────

/** Button-level hover: subtle scale */
export const HoverScale: React.FC<{
  children: React.ReactNode;
  scale?: number;
  className?: string;
}> = ({ children, scale = 1.03, className }) => (
  <motion.div
    whileHover={{ scale }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: DURATION_MICRO, ease: EASE_MICRO }}
    className={className}
  >
    {children}
  </motion.div>
);

/** Card hover: slight Y lift + border glow via CSS class */
export const HoverLift: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <motion.div
    whileHover={{ y: -3, scale: 1.02 }}
    transition={{ duration: DURATION_MICRO, ease: EASE_MICRO }}
    className={`transition-shadow hover:shadow-[0_0_0_2px_var(--accent)] ${className ?? ''}`}
  >
    {children}
  </motion.div>
);

/** Modal enter/exit */
export const modalTransition: Transition = {
  duration: 0.25,
  ease: EASE_MICRO,
};
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

// ─── Page transition wrapper ─────────────────────────────────
export const PageTransition: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.35, ease: EASE_REVEAL }}
    className={className}
  >
    {children}
  </motion.div>
);
