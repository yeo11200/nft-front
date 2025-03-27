import { motion } from "framer-motion";
import styles from "./Spinner.module.scss";

export interface SpinnerProps {
  size?: "small" | "medium" | "large";
  color?: string;
  fullScreen?: boolean;
  text?: string;
}

const Spinner = ({
  size = "medium",
  color = "#3498db",
  fullScreen = false,
  text,
}: SpinnerProps) => {
  const spinnerVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      },
    },
  };

  const spinnerContent = (
    <>
      <motion.div
        className={`${styles.spinner} ${styles[size]}`}
        style={{ borderTopColor: color }}
        variants={spinnerVariants}
        animate="animate"
      />
      {text && <p className={styles.text}>{text}</p>}
    </>
  );

  if (fullScreen) {
    return (
      <div className={styles.fullScreenContainer}>
        <div className={styles.spinnerWrapper}>{spinnerContent}</div>
      </div>
    );
  }

  return <div className={styles.container}>{spinnerContent}</div>;
};

export default Spinner;
