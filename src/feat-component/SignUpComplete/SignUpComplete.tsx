import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./SignUpComplete.module.scss";
import confetti from "canvas-confetti";

interface SignUpCompleteProps {
  onAnimationComplete?: () => void;
}

const SignUpComplete: React.FC<SignUpCompleteProps> = ({
  onAnimationComplete,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    // 닉네임 가져오기
    const state = location.state as { nickname?: string } | null;
    const storedUserInfo = localStorage.getItem("userInfo");

    let userNickname = "";
    if (state && state.nickname) {
      userNickname = state.nickname;
    } else if (storedUserInfo) {
      try {
        const userInfo = JSON.parse(storedUserInfo);
        console.log("userInfo", userInfo);
        userNickname = userInfo.userId || "사용자";
      } catch (e) {
        userNickname = "사용자";
      }
    } else {
      userNickname = "사용자";
    }

    setNickname(userNickname);

    // 축하 폭죽 효과 실행
    triggerConfetti();

    // 3초 후 메인 페이지로 자동 이동
    const timer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      } else {
        navigate("/");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [location, navigate, onAnimationComplete]);

  // 폭죽 효과 함수
  const triggerConfetti = () => {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // 왼쪽에서 발사
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });

      // 오른쪽에서 발사
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  // 애니메이션 변수
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.5 } },
  };

  const checkVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 10,
        delay: 0.2,
      },
    },
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.8,
      },
    },
  };

  return (
    <motion.div
      className={styles.container}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className={styles.content}>
        {/* 체크 마크 애니메이션 */}
        <motion.div
          className={styles.checkmarkContainer}
          variants={checkVariants}
          initial="hidden"
          animate="visible"
        >
          <svg
            className={styles.checkmark}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 52 52"
          >
            <circle
              className={styles.checkmarkCircle}
              cx="26"
              cy="26"
              r="25"
              fill="none"
            />
            <path
              className={styles.checkmarkCheck}
              fill="none"
              d="M14.1 27.2l7.1 7.2 16.7-16.8"
            />
          </svg>
        </motion.div>

        {/* 텍스트 애니메이션 */}
        <motion.div
          className={styles.textContainer}
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          <p>
            환영해요, <strong>{nickname}</strong>님!
          </p>
          <p className={styles.subText}>잠시 후 메인 화면으로 이동합니다...</p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SignUpComplete;
