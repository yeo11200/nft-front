import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Confirm.module.scss";

interface ConfirmProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const Confirm: React.FC<ConfirmProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "확인",
  cancelText = "취소",
}) => {
  return (
    <AnimatePresence>
      <div className={styles.overlay}>
        <motion.div
          className={styles.confirm}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
        >
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.message}>{message}</p>
          <div className={styles.buttons}>
            <button
              className={`${styles.button} ${styles.cancel}`}
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              className={`${styles.button} ${styles.confirm}`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
