'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

// Re-export for direct use
export { motion, AnimatePresence };

interface MotionProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

// FadeIn — opacity 0→1 with optional delay
export function FadeIn({ children, delay = 0, duration = 0.4, className }: MotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// SlideUp — translate-y 20→0 + fade
export function SlideUp({ children, delay = 0, duration = 0.5, className }: MotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// StaggerContainer + StaggerItem — staggered children
export function StaggerContainer({ children, className, delay = 0 }: MotionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.1,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: Omit<MotionProps, 'delay' | 'duration'>) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ScaleIn — scale 0.9→1 spring animation
export function ScaleIn({ children, delay = 0, className }: Omit<MotionProps, 'duration'>) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
