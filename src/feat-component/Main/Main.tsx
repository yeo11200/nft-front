import React, { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import styles from "./Main.module.scss";

const Main: React.FC = () => {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  useEffect(() => {
    // 애니메이션 시작
    if (inView) {
      controls.start("visible");
    }
  }, [controls, inView]);

  // 애니메이션 변수
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 10 },
    },
  };

  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10,
        delay: 0.2,
      },
    },
  };

  const subtitleVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10,
        delay: 0.4,
      },
    },
  };

  const floatingVariants = {
    initial: { y: 0 },
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut",
      },
    },
  };

  const glowVariants = {
    initial: { opacity: 0.5, scale: 1 },
    animate: {
      opacity: [0.5, 1, 0.5],
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut",
      },
    },
  };

  const textRevealVariants = {
    hidden: { width: "0%" },
    visible: {
      width: "100%",
      transition: {
        duration: 0.8,
        ease: "easeInOut",
        delay: 0.6,
      },
    },
  };

  return (
    <div className={styles.mainContainer}>
      {/* 배경 그라데이션 효과 */}
      <div className={styles.gradientBackground}></div>

      {/* 메인 콘텐츠 */}
      <motion.div
        className={styles.heroSection}
        ref={ref}
        variants={containerVariants}
        initial="hidden"
        animate={controls}
      >
        <motion.div className={styles.heroContent}>
          <motion.h1 className={styles.mainTitle} variants={titleVariants}>
            <motion.span
              className={styles.highlight}
              variants={glowVariants}
              initial="initial"
              animate="animate"
            >
              Speak-to-Transact
            </motion.span>
          </motion.h1>

          <motion.div
            className={styles.subtitleContainer}
            variants={subtitleVariants}
          >
            <motion.div
              className={styles.subtitleWrapper}
              variants={textRevealVariants}
            >
              <p className={styles.subtitle}>
                LLM으로 구동되는 XRPL 자율 에이전트
              </p>
            </motion.div>
          </motion.div>

          <motion.p className={styles.description} variants={itemVariants}>
            자연어로 명령하고, 블록체인에서 실행하세요.
            <br />
            복잡한 코드 없이 간단한 대화만으로 XRPL 트랜잭션을 처리합니다.
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.heroImage}
          variants={floatingVariants}
          initial="initial"
          animate="animate"
        >
          <div className={styles.imageContainer}>
            <motion.div
              className={styles.glow}
              variants={glowVariants}
              initial="initial"
              animate="animate"
            ></motion.div>
            <div className={styles.xrplIcon}>🌊</div>
            <div className={styles.llmIcon}>🤖</div>
            <div className={styles.speechIcon}>💬</div>
          </div>
        </motion.div>
      </motion.div>

      {/* 특징 섹션 */}
      <motion.section
        className={styles.featuresSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <motion.h2
          className={styles.sectionTitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          주요 기능
        </motion.h2>

        <div className={styles.featuresGrid}>
          {[
            {
              icon: "🗣️",
              title: "음성 명령",
              description: "자연어로 트랜잭션을 설명하고 실행하세요.",
            },
            {
              icon: "🔐",
              title: "안전한 지갑",
              description: "사용자 자산을 안전하게 보관하고 관리합니다.",
            },
            {
              icon: "⚡",
              title: "빠른 처리",
              description: "XRPL의 빠른 속도로 즉시 트랜잭션을 처리합니다.",
            },
            {
              icon: "🤝",
              title: "자율 에이전트",
              description: "복잡한 작업을 자동으로 처리하는 AI 에이전트.",
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              className={styles.featureCard}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + index * 0.1, duration: 0.5 }}
              whileHover={{
                y: -5,
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 장식 요소들 */}
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
          ✨
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
          🚀
        </motion.div>
        <motion.div
          className={`${styles.decoration} ${styles.decoration3}`}
          animate={{
            y: [0, 15, 0],
            rotate: [0, -5, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: "easeInOut",
            delay: 1,
          }}
        >
          💫
        </motion.div>
      </div>
    </div>
  );
};

export default Main;
