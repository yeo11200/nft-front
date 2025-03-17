import { motion } from "framer-motion";
import styles from "./Wallet.module.scss";
import { useUI } from "../../contexts/UIContext";

interface Friend {
  nickname: string;
  name: string;
  walletAddress: string;
  emoji: string;
}

const Wallet = () => {
  const { toast, alert } = useUI();

  const walletInfo = {
    balance: "0.2564",
    currency: "BTC",
    krwBalance: "4,250,000",
    address: "0x1234567890ABCDEF1234567890ABCDEF12345678",
  };

  const friends: Friend[] = [
    {
      nickname: "블록왕",
      name: "홍길동",
      walletAddress: "0x1234567890ABCDEF1234567890ABCDEF12345678+1",
      emoji: "🙂",
    },
    {
      nickname: "체인마스터",
      name: "김철수",
      walletAddress: "0x1234567890ABCDEF1234567890ABCDEF12345678+2",
      emoji: "😄",
    },
    {
      nickname: "NFT러버",
      name: "이영희",
      walletAddress: "0x1234567890ABCDEF1234567890ABCDEF12345678+3",
      emoji: "😁",
    },
  ];

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("복사에 성공했습니다.", "success");
    } catch (err) {
      console.error("복사 실패:", err);
      alert("복사에 실패했습니다.", "");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.walletSection}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h2 className={styles.sectionTitle}>👛 내 지갑</h2>
        <div className={styles.balanceInfo}>
          <span className={styles.cryptoBalance}>
            ₿ {walletInfo.balance} {walletInfo.currency}
          </span>
          <span className={styles.krwBalance}>≈ {walletInfo.krwBalance}원</span>
        </div>
        <div className={styles.addressContainer}>
          <span className={styles.addressLabel}>주소: </span>
          <span className={styles.address}>
            {`${walletInfo.address.slice(0, 6)}...${walletInfo.address.slice(
              -4
            )}`}
          </span>
          <button
            className={styles.copyButton}
            onClick={() => handleCopyToClipboard(walletInfo.address)}
          >
            복사
          </button>
        </div>
      </motion.div>

      <motion.div
        className={styles.friendsSection}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        <h2 className={styles.sectionTitle}>👥 내 친구</h2>
        <div className={styles.friendsList}>
          {friends.map((friend, index) => (
            <motion.div
              key={friend.walletAddress}
              className={styles.friendItem}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 * index }}
            >
              <div className={styles.friendInfo}>
                <span className={styles.emoji}>{friend.emoji}</span>
                <span className={styles.nickname}>{friend.nickname}</span>
                <span className={styles.name}>({friend.name})</span>
              </div>
              <div className={styles.friendAddress}>
                <span className={styles.walletText}>
                  {`${friend.walletAddress.slice(
                    0,
                    6
                  )}...${friend.walletAddress.slice(-4)}`}
                </span>
                <button
                  className={styles.copyButton}
                  onClick={() => handleCopyToClipboard(friend.walletAddress)}
                >
                  복사
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Wallet;
