import React from "react";
import { motion } from "framer-motion";
import styles from "./Spinner.module.scss";

interface SpinnerProps {
  size?: "small" | "medium" | "large";
  color?: string;
  fullScreen?: boolean;
  text?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "medium",
  color = "#3498db",
  fullScreen = false,
  text,
}) => {
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
