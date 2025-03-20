import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { motion } from "framer-motion";
import styles from "./TransactionHistory.module.scss";
import { useUI } from "../../contexts/UIContext";
import { useSpinner } from "../../contexts/SpinnerContext";
import { Transaction, useXrplAccount } from "../../hooks/useXrplAccount";
import { useCryptoPrice } from "../../contexts/CryptoPriceContext";
import { convertXrpToKrw } from "../../utils/common";
dayjs.locale("ko");

const TransactionHistory: React.FC = () => {
  const { toast } = useUI();
  const { showSpinner, hideSpinner } = useSpinner();
  const { getTransactionHistory } = useXrplAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [myWalletAddress, setMyWalletAddress] = useState<string>("");
  const { xrpPriceInfo } = useCryptoPrice();

  const formatAddress = useCallback((address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  // 거래 내역에 "나" 표시 추가
  const processedTransactions = useMemo(() => {
    return transactions.map((tx) => ({
      ...tx,
      fromName:
        tx.fromAddress === myWalletAddress
          ? "나"
          : formatAddress(tx.fromAddress),
      toName:
        tx.toAddress === myWalletAddress ? "나" : formatAddress(tx.toAddress),
      // 거래 방향 (보낸 것인지 받은 것인지)
      isOutgoing: tx.fromAddress === myWalletAddress,
      // 실제 금액 (보낸 경우 음수, 받은 경우 양수)
      effectiveAmount:
        tx.fromAddress === myWalletAddress
          ? -Math.abs(parseFloat(tx.amount))
          : Math.abs(parseFloat(tx.amount)),
    }));
  }, [myWalletAddress, transactions, formatAddress]);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast("주소가 복사되었습니다.", "success");
  };

  // 거래 내역 가져오기
  const fetchTransactionHistory = useCallback(
    async (address: string) => {
      try {
        showSpinner("거래 내역 로드 중...");
        setIsLoading(true);
        const data = await getTransactionHistory(address);
        if (data.transactions) {
          setTransactions(data.transactions);
        }
        hideSpinner();
        setIsLoading(false);
      } catch (err) {
        console.error("계정 정보 가져오기 오류:", err);
        toast("거래 내역을 가져오는 중 오류가 발생했습니다.", "error");
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
        setMyWalletAddress(parsedInfo.address);
        // 컴포넌트 마운트 시 계정 정보 가져오기
        fetchTransactionHistory(parsedInfo.address);
      } catch (error) {
        console.error("사용자 정보 파싱 오류:", error);
      }
    }
  }, [fetchTransactionHistory]);

  if (isLoading) {
    return <></>;
  }

  return (
    <div className={styles.historyContainer}>
      <h2 className={styles.title}>🧾 최근 거래 내역</h2>

      {processedTransactions.length > 0 ? (
        processedTransactions.map((tx) => (
          <motion.div
            key={tx.hash}
            className={styles.transactionCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.cardHeader}>
              <div className={styles.dateTime}>
                <span className={styles.dateIcon}>📅</span>
                {dayjs(tx.timestamp).format("YYYY-MM-DD (HH:mm)")}
              </div>
              <div
                className={`${styles.status} ${
                  tx.status === "success"
                    ? styles.statusSuccess
                    : styles.statusFailed
                }`}
              >
                {tx.status === "success" ? "✅ 완료됨" : "❌ 실패"}
              </div>
            </div>

            <div className={styles.transactionDetails}>
              <div className={styles.participants}>
                <div className={styles.participant}>
                  <div className={styles.participantLabel}>보낸 사람</div>
                  <div className={styles.participantValue}>
                    <span className={tx.fromName === "나" ? styles.isMe : ""}>
                      {tx.fromName}
                    </span>
                    {tx.fromName !== "나" && (
                      <button
                        className={styles.copyButton}
                        onClick={() => handleCopyAddress(tx.fromAddress)}
                        aria-label="주소 복사"
                      >
                        [복사]
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.transferArrow}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12H19M19 12L13 6M19 12L13 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className={styles.participant}>
                  <div className={styles.participantLabel}>받은 사람</div>
                  <div className={styles.participantValue}>
                    <span className={tx.toName === "나" ? styles.isMe : ""}>
                      {tx.toName}
                    </span>
                    {tx.toName !== "나" && (
                      <button
                        className={styles.copyButton}
                        onClick={() => handleCopyAddress(tx.toAddress)}
                        aria-label="주소 복사"
                      >
                        [복사]
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`${styles.amount} ${
                  tx.effectiveAmount < 0 ? styles.negative : styles.positive
                }`}
              >
                <span className={styles.amountIcon}>
                  {tx.effectiveAmount < 0 ? "💸" : "💰"}
                </span>
                <span className={styles.amountValue}>
                  {tx.effectiveAmount > 0 ? "+" : ""}
                  {new Intl.NumberFormat("ko-KR").format(
                    Math.abs(tx.effectiveAmount)
                  )}{" "}
                  XRP
                </span>

                {xrpPriceInfo && (
                  <span className={styles.amountInKrw}>
                    (
                    {convertXrpToKrw(
                      Math.abs(tx.effectiveAmount),
                      xrpPriceInfo
                    )}
                    )
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))
      ) : (
        <motion.div
          className={styles.emptyHistory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={styles.emptyIcon}>📭</div>
          <p className={styles.emptyText}>아직 거래 내역이 없어요</p>
          <p className={styles.emptySubtext}>첫 거래를 시작해보세요!</p>
        </motion.div>
      )}
    </div>
  );
};

export default TransactionHistory;
