import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.scss";

interface HeaderProps {
  showUserInfo?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showUserInfo = true }) => {
  const [nickname, setNickname] = useState<string>("사용자");
  const navigate = useNavigate();

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) {
      try {
        const parsedInfo = JSON.parse(userInfo);
        if (parsedInfo.userId) {
          setNickname(parsedInfo.userId);
        }
      } catch (error) {
        console.error("사용자 정보 파싱 오류:", error);
      }
    }
  }, []);

  const handleLogoClick = () => {
    navigate("/");
  };

  return (
    <motion.header
      className={styles.header}
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className={styles.leftSection}>
        <motion.div
          className={styles.logo}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogoClick}
        >
          XRPLLM
        </motion.div>

        {showUserInfo && (
          <motion.div
            className={styles.userInfo}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            안녕하세요, {nickname}님!
          </motion.div>
        )}
      </div>

      <div className={styles.navLinks}>
        <Link to="/wallet">
          <motion.div
            className={styles.navLink}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            지갑
          </motion.div>
        </Link>
        <Link to="/transaction-history">
          <motion.div
            className={styles.navLink}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            거래내역
          </motion.div>
        </Link>
      </div>
    </motion.header>
  );
};

export default Header;
