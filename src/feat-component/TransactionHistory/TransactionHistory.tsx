import React, { useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { motion } from "framer-motion";
import styles from "./TransactionHistory.module.scss";
import { useUI } from "../../contexts/UIContext";

dayjs.locale("ko");

interface Transaction {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  fromName?: string;
  toName?: string;
}

const TransactionHistory: React.FC = () => {
  const { toast } = useUI();
  // 현재 사용자의 지갑 주소 (실제로는 context나 props로 받아와야 함)
  const myWalletAddress = "0x1234567890ABCDEF";

  // 임시 데이터
  const transactions: Transaction[] = useMemo(
    () => [
      {
        id: "1",
        timestamp: Date.now(),
        from: "0x1234567890ABCDEF", // 내 지갑 주소
        to: "0xABCDEF1234567890",
        amount: -0.015,
        status: "completed",
        toName: "김블록",
      },
      {
        id: "2",
        timestamp: Date.now() - 86400000,
        from: "0x5678EF12ABCD9012",
        to: "0x1234567890ABCDEF", // 내 지갑 주소
        amount: 0.075,
        status: "completed",
        fromName: "박체인",
      },
    ],
    []
  );

  // 거래 내역에 "나" 표시 추가
  const processedTransactions = useMemo(() => {
    return transactions.map((tx) => ({
      ...tx,
      fromName: tx.from === myWalletAddress ? "나" : tx.fromName,
      toName: tx.to === myWalletAddress ? "나" : tx.toName,
      // 거래 방향 (보낸 것인지 받은 것인지)
      isOutgoing: tx.from === myWalletAddress,
      // 실제 금액 (보낸 경우 음수, 받은 경우 양수)
      effectiveAmount:
        tx.from === myWalletAddress
          ? -Math.abs(tx.amount)
          : Math.abs(tx.amount),
    }));
  }, [transactions]);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast("주소가 복사되었습니다.", "success");
  };

  const getStatusIcon = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return "✅";
      case "pending":
        return "⏳";
      case "failed":
        return "🚫";
      default:
        return "";
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className={styles.historyContainer}>
      <h2 className={styles.title}>🧾 최근 거래 내역</h2>
      {processedTransactions.map((tx) => (
        <motion.div
          key={tx.id}
          className={styles.transactionCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.dateTime}>
            📅 {dayjs(tx.timestamp).format("YYYY-MM-DD (HH:mm)")}
          </div>

          <div className={styles.participants}>
            <div className={styles.participant}>
              <span className={styles.label}>보낸 사람: </span>
              <span className={styles.value}>
                {tx.fromName}{" "}
                {tx.fromName !== "나" && (
                  <button
                    className={styles.copyButton}
                    onClick={() => handleCopyAddress(tx.from)}
                  >
                    ({formatAddress(tx.from)}) [복사]
                  </button>
                )}
              </span>
            </div>
            <div className={styles.participant}>
              <span className={styles.label}>받은 사람: </span>
              <span className={styles.value}>
                {tx.toName}{" "}
                {tx.toName !== "나" && (
                  <button
                    className={styles.copyButton}
                    onClick={() => handleCopyAddress(tx.to)}
                  >
                    ({formatAddress(tx.to)}) [복사]
                  </button>
                )}
              </span>
            </div>
          </div>

          <div
            className={`${styles.amount} ${
              tx.amount < 0 ? styles.negative : styles.positive
            }`}
          >
            {tx.amount < 0 ? "💸" : "💰"} {tx.amount > 0 ? "+" : ""}₿
            {Math.abs(tx.amount).toFixed(3)}
            <span className={styles.krw}>
              (~
              {new Intl.NumberFormat("ko-KR").format(
                Math.abs(tx.amount * 20000000)
              )}
              원)
            </span>
          </div>

          <div className={styles.status}>
            {getStatusIcon(tx.status)}{" "}
            {tx.status === "completed"
              ? "완료됨"
              : tx.status === "pending"
              ? "처리중"
              : "실패"}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default TransactionHistory;
