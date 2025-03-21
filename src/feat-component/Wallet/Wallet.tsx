import { motion } from "framer-motion";
import styles from "./Wallet.module.scss";
import { useUI } from "../../contexts/UIContext";
import { useCallback, useEffect, useState } from "react";
import { AccountResponseDto } from "@/types/account/response.dto";
import { useXrplAccount } from "../../hooks/useXrplAccount";
import { useSpinner } from "../../contexts/SpinnerContext";
import { useCryptoPrice } from "../../contexts/CryptoPriceContext";
import { convertXrpToKrw } from "../../utils/common";
import { useTransactionDetail } from "../../contexts/TransactionDetailContext";

export interface Friend {
  nickname: string;
  address: string;
  emoji: string;
}

const Wallet = () => {
  const [isLoading, setIsLoading] = useState(false);

  const { openTransactionDetail } = useTransactionDetail();
  const [accountData, setAccountData] = useState<AccountResponseDto["account"]>(
    {
      address: "",
      secret: "",
      balance: "0",
    }
  );
  const friends = JSON.parse(localStorage.getItem("friends") || "[]");
  const { sendPayment, getAccountInfo } = useXrplAccount();
  const { showSpinner, hideSpinner } = useSpinner();
  const { xrpPriceInfo } = useCryptoPrice();
  const { toast, confirm } = useUI();

  const handleSendPayment = async (friend: Friend) => {
    const result = await confirm(
      `송금 하실래요?`,
      `${friend.nickname}에게 1 XRP를 보내는 작업을 준비했어요.  인증 해주시면 바로 보낼게요!`,
      {
        confirmText: "송금",
        cancelText: "취소",
        confirmStyle: "primary",
        onConfirmAction: async () => {
          showSpinner("송금 중...");
          const res = await sendPayment({
            fromAddress: accountData.address,
            toAddress: friend.address,
            amount: 1,
            secret: accountData.secret,
          });

          console.log("result", res?.transaction);

          if (res?.transaction) {
            openTransactionDetail(res.transaction.hash);
          }
          const data = await getAccountInfo(accountData.address);

          if (data.account) {
            setAccountData((props) => ({
              ...props,
              balance: data?.account?.balance || "0",
            }));
          }
          hideSpinner();
        },
      }
    );
    if (result) {
      console.log("송금 진행");
    }
  };

  // XRP 잔액 변환 함수 (drops -> XRP)
  const formatXrpBalance = (balanceInDrops: string): string => {
    // balance를 숫자로 변환하고 1,000,000으로 나누어 XRP 단위로 표시
    const balanceInXrp = parseFloat(balanceInDrops) / 1000000;
    return balanceInXrp.toLocaleString("ko-KR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  // 계정 정보 가져오기
  const fetchAccountInfo = useCallback(
    async (address: string, secret: string) => {
      try {
        setIsLoading(true);
        showSpinner("계정 정보 로드 중...");
        const data = await getAccountInfo(address, secret);
        console.log(data, "data");
        if (data.account) {
          setAccountData({
            ...data.account,
            secret: data.account.secret || "",
          });
        }
        hideSpinner();
        setIsLoading(false);
      } catch (err) {
        console.error("계정 정보 가져오기 오류:", err);
        toast("계정 정보를 가져오는 중 오류가 발생했습니다.", "error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast]
  );

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) {
      try {
        const parsedInfo = JSON.parse(userInfo);
        // 컴포넌트 마운트 시 계정 정보 가져오기
        fetchAccountInfo(parsedInfo.address, parsedInfo.secret);
      } catch (error) {
        console.error("사용자 정보 파싱 오류:", error);
      }
    }
  }, [fetchAccountInfo]);

  if (isLoading) {
    return <></>;
  }

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.walletSection}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h2 className={styles.sectionTitle}>
          <span className={styles.emoji}>👛</span> 내 지갑
        </h2>
        <div className={styles.walletCard}>
          <div className={styles.balanceSection}>
            <div className={styles.balanceLabel}>보유 잔액</div>
            <div className={styles.balanceAmount}>
              {formatXrpBalance(accountData.balance)} XRP
            </div>
            {xrpPriceInfo && (
              <div className={styles.krwValue}>
                {convertXrpToKrw(
                  parseFloat(formatXrpBalance(accountData.balance)),
                  xrpPriceInfo
                )}
              </div>
            )}
          </div>
          <div className={styles.addressSection}>
            <div className={styles.addressLabel}>주소:</div>
            <div className={styles.addressValue}>
              {`${accountData.address.slice(
                0,
                8
              )}...${accountData.address.slice(-8)}`}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className={styles.friendsSection}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        <h2 className={styles.sectionTitle}>
          <span className={styles.emoji}>👥</span> 내 친구
        </h2>
        <div className={styles.friendsList}>
          {friends.length > 0 ? (
            friends.map((friend, index) => (
              <motion.div
                key={friend.address}
                className={styles.friendItem}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 * index }}
              >
                <div className={styles.friendInfo}>
                  <span className={styles.friendEmoji}>{friend.emoji}</span>
                  <span className={styles.friendName}>{friend.nickname}</span>
                </div>
                <div className={styles.friendAddress}>
                  <span className={styles.addressText}>
                    {`${friend.address.slice(0, 6)}...${friend.address.slice(
                      -4
                    )}`}
                  </span>
                  <button
                    className={styles.sendButton}
                    onClick={() => handleSendPayment(friend)}
                  >
                    송금
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              className={styles.emptyFriends}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className={styles.emptyIcon}>🔍</div>
              <p className={styles.emptyText}>아직 등록된 친구가 없어요</p>
              <p className={styles.emptySubtext}>
                친구를 추가하고 XRP를 주고받아보세요!
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Wallet;
