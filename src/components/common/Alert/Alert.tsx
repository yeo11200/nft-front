import { motion, AnimatePresence } from "framer-motion";
import styles from "./Alert.module.scss";

export interface AlertProps {
  title: string;
  message: string;
  onClose: () => void;
  type?: "success" | "error" | "info" | "warning";
}

const Alert = ({ title, message, onClose, type = "info" }: AlertProps) => {
  return (
    <AnimatePresence>
      <div className={styles.overlay}>
        <motion.div
          className={`${styles.alert} ${styles[type]}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
        >
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.message}>{message}</p>
          <button className={styles.button} onClick={onClose}>
            확인
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default Alert;
