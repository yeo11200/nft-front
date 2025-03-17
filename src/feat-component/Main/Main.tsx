import { motion } from "framer-motion";
import styles from "./Main.module.scss";

const textVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.3,
      type: "spring",
      stiffness: 100,
      damping: 10,
    },
  }),
};

const Main = () => {
  const texts = [
    "쉽고 재미있는 블록체인",
    "Easy & Fun Blockchain",
    "블록체인이 어렵다고? NO!",
    "누구나 즐기는 블록체인",
  ];

  return (
    <div className={styles.container}>
      <div className={styles.textContainer}>
        {texts.map((text, index) => (
          <motion.div
            key={text}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={textVariants}
            className={styles.textItem}
          >
            {text.split("").map((char, charIndex) => (
              <motion.span
                key={charIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.3 + charIndex * 0.05,
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
                className={styles.char}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Main;
