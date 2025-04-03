import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./SignUp.module.scss";
import { useXrplAccount } from "../../hooks";

const SignUp = () => {
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { createAccount } = useXrplAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    if (nickname.length < 2 || nickname.length > 10) {
      setError("닉네임은 2~10자 사이로 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // 실제 구현에서는 여기서 API 호출
      await createAccount(nickname); // 가상의 API 지연

      // 완료 애니메이션 페이지로 이동
      navigate("/signup-complete");
    } catch (err) {
      console.error("회원가입 오류:", err);
      setError("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.formContainer}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className={styles.welcomeEmoji}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          }}
        >
          👋
        </motion.div>

        <motion.h1
          className={styles.welcomeTitle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          반가워!
        </motion.h1>

        <motion.p
          className={styles.welcomeText}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          앞으로 널 어떻게 부르면 돼?
        </motion.p>

        <motion.div className={styles.inputGroup} transition={{ delay: 0.5 }}>
          <input
            type="text"
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력해주세요 (2~10자)"
            disabled={isSubmitting}
            autoFocus
            className={styles.nicknameInput}
          />
          {error && (
            <motion.p
              className={styles.error}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.p>
          )}
        </motion.div>

        <motion.button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={handleSubmit}
        >
          {isSubmitting ? "처리 중..." : "좋아, 가볼까? 🚀"}
        </motion.button>
      </motion.div>

      {/* 배경 장식 요소들 */}
      <div className={styles.decorations}>
        <motion.div
          className={`${styles.decoration} ${styles.decoration1}`}
          animate={{
            y: [0, -15, 0],
            rotate: [0, 5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "easeInOut",
          }}
        >
          🌟
        </motion.div>
        <motion.div
          className={`${styles.decoration} ${styles.decoration2}`}
          animate={{
            y: [0, 15, 0],
            rotate: [0, -5, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 6,
            ease: "easeInOut",
            delay: 0.5,
          }}
        >
          ✨
        </motion.div>
        <motion.div
          className={`${styles.decoration} ${styles.decoration3}`}
          animate={{
            y: [0, -10, 0],
            rotate: [0, 10, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 7,
            ease: "easeInOut",
            delay: 1,
          }}
        >
          🚀
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SignUp;
