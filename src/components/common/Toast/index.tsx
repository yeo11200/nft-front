import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Toast.module.scss";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className={`${styles.toastContainer}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={`${styles.toast} ${styles[type]}`}
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          exit={{ y: -50 }}
        >
          {message}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
