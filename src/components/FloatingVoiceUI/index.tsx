import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./FloatingVoiceUI.module.scss";

interface FloatingVoiceUIProps {
  open: boolean;
  isActive: boolean;
  transcript: string;
  onClick: () => void;
}

export const FloatingVoiceUI: React.FC<FloatingVoiceUIProps> = ({
  open,
  isActive,
  transcript,
  onClick,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          {isActive && (
            <motion.div
              className={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
          <div className={styles.fixedContainer}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              className={styles.container}
            >
              <motion.div
                className={styles.ripple}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0.2, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className={styles.microphone}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </motion.div>
              {transcript && (
                <motion.div
                  className={styles.transcript}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                >
                  {transcript}
                </motion.div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
