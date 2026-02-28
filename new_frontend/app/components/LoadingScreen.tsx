/**
 * Loading Screen — Solais-style initial loading with counter
 * 
 * Features:
 * - Counter animation 0 → 100%
 * - Floating binary/hex code  
 * - Gradient background
 * - Smooth reveal transition
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingScreenProps {
  onComplete: () => void;
  duration?: number; // milliseconds
}

// Floating code snippets
const floatingCode = [
  { text: '0x7F3A', x: 15, y: 20, delay: 0 },
  { text: '10110011', x: 75, y: 15, delay: 0.2 },
  { text: 'ASA', x: 85, y: 45, delay: 0.4 },
  { text: '01001010', x: 10, y: 60, delay: 0.3 },
  { text: '0xE08A', x: 70, y: 70, delay: 0.5 },
  { text: 'ALGO', x: 25, y: 80, delay: 0.1 },
  { text: '11110001', x: 55, y: 25, delay: 0.6 },
  { text: '0x00', x: 40, y: 55, delay: 0.35 },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  duration = 2500,
}) => {
  const [count, setCount] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const targetCount = 100;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Eased progress (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.floor(eased * targetCount);
      
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Start exit animation
        setIsExiting(true);
        setTimeout(onComplete, 600);
      }
    };

    requestAnimationFrame(animate);
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.1,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{
            background: 'linear-gradient(135deg, #030a07 0%, #07110d 40%, #0d2318 70%, #143d2b 100%)',
          }}
        >
          {/* Floating code elements */}
          {floatingCode.map((code, i) => (
            <motion.div
              key={i}
              className="absolute font-mono text-accent/30 text-sm select-none"
              style={{ left: `${code.x}%`, top: `${code.y}%` }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: [0, 0.4, 0.2, 0.4],
                y: [20, 0, -10, 0],
              }}
              transition={{
                delay: code.delay,
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            >
              {code.text}
            </motion.div>
          ))}

          {/* Gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-[100px]" />

          {/* Center content */}
          <div className="relative z-10 text-center">
            {/* Logo/Brand */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-accent text-sm uppercase tracking-[0.3em] font-bold mb-2">
                Asset Tokenization
              </div>
              <div className="text-muted-foreground text-xs tracking-wider">
                Algorand Infrastructure
              </div>
            </motion.div>

            {/* Counter */}
            <motion.div
              className="relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <span className="text-[120px] md:text-[180px] font-bold text-foreground leading-none tracking-tight tabular-nums">
                {count.toString().padStart(2, '0')}
              </span>
              <span className="text-4xl md:text-6xl font-bold text-accent ml-2">%</span>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              className="mt-8 w-64 mx-auto h-[2px] bg-foreground/10 rounded-full overflow-hidden"
              initial={{ opacity: 0, scaleX: 0.5 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <motion.div
                className="h-full bg-accent"
                style={{ width: `${count}%` }}
                transition={{ duration: 0.1 }}
              />
            </motion.div>

            {/* Status text */}
            <motion.div
              className="mt-6 text-muted-foreground text-sm uppercase tracking-widest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {count < 30 && 'Initializing...'}
              {count >= 30 && count < 60 && 'Connecting to Algorand...'}
              {count >= 60 && count < 90 && 'Loading assets...'}
              {count >= 90 && 'Ready'}
            </motion.div>
          </div>

          {/* Decorative lines */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
