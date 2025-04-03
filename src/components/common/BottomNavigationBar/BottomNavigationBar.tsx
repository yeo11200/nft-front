import { Link } from "react-router-dom";
import styles from "./BottomNavigationBar.module.scss";

const BottomNavigationBar = () => {
  const pathname = window.location.pathname;

  // 현재 경로에 따라 활성화된 탭 결정
  const isActive = (path: string) => {
    if (pathname === path) return true;
    // 홈페이지 & 메인페이지 같이 취급
    if (pathname === "/" && path === "/main") return true;
    return false;
  };

  return (
    <nav className={styles.navbar}>
      <Link
        to="/main"
        className={`${styles.navItem} ${
          isActive("/main") ? styles.active : ""
        }`}
      >
        <span className={styles.icon}>🏠</span>
        <span className={styles.text}>홈</span>
      </Link>
      <Link
        to="/wallet"
        className={`${styles.navItem} ${
          isActive("/wallet") ? styles.active : ""
        }`}
      >
        <span className={styles.icon}>👛</span>
        <span className={styles.text}>지갑</span>
      </Link>
      <Link
        to="/friends"
        className={`${styles.navItem} ${
          isActive("/friends") ? styles.active : ""
        }`}
      >
        <span className={styles.icon}>👥</span>
        <span className={styles.text}>친구</span>
      </Link>
      <Link
        to="/transaction-history"
        className={`${styles.navItem} ${
          isActive("/transaction-history") ? styles.active : ""
        }`}
      >
        <span className={styles.icon}>📊</span>
        <span className={styles.text}>내역</span>
      </Link>
    </nav>
  );
};

export default BottomNavigationBar;
