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
import { useTransactionDetail } from "../../contexts/TransactionDetailContext";
dayjs.locale("ko");

interface Friend {
  nickname: string;
  address: string;
  emoji?: string;
}

// 트랜잭션 상태 응답 타입 정의
interface TransactionStatusResponse {
  text: string;
  className: string;
  isScheduled?: boolean;
}

// 트랜잭션 타입별 아이콘 매핑
const TX_TYPE_ICONS: { [key: string]: string } = {
  Payment: "💸",
  OfferCreate: "🔄",
  OfferCancel: "❌",
  TrustSet: "🤝",
  EscrowCreate: "⏳",
  EscrowFinish: "✅",
  EscrowCancel: "❎",
  NFTokenMint: "🎨",
  NFTokenBurn: "🔥",
  NFTokenCreateOffer: "📝",
  NFTokenAcceptOffer: "🤝",
  NFTokenCancelOffer: "❌",
  SetRegularKey: "🔑",
  SignerListSet: "📋",
  AccountSet: "⚙️",
  Default: "📄",
};

const TransactionHistory: React.FC = () => {
  const { toast } = useUI();
  const { showSpinner, hideSpinner } = useSpinner();
  const { getTransactionHistory } = useXrplAccount();
  const { openTransactionDetail } = useTransactionDetail();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [myWalletAddress, setMyWalletAddress] = useState<string>("");
  const { xrpPriceInfo } = useCryptoPrice();
  const [friends, setFriends] = useState<Friend[]>([]);

  const formatAddress = useCallback((address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  // 주소로 친구 찾기
  const findFriendByAddress = useCallback(
    (address: string): Friend | null => {
      return friends.find((friend) => friend.address === address) || null;
    },
    [friends]
  );

  // 토큰 정보 포맷팅
  const formatTokenInfo = useCallback((tokenInfo: any): string => {
    if (!tokenInfo) return "";
    if (typeof tokenInfo === "string") {
      // XRP 금액인 경우 (Drops를 XRP로 변환)
      const xrpAmount = parseFloat(tokenInfo) / 1000000;
      return `${xrpAmount.toLocaleString("ko-KR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })} XRP`;
    } else if (tokenInfo.currency && tokenInfo.value) {
      // 발행된 토큰인 경우
      return `${parseFloat(tokenInfo.value).toLocaleString("ko-KR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })} ${tokenInfo.currency}`;
    }
    return "";
  }, []);

  // 트랜잭션 유형별 제목 포맷팅
  const getTransactionTitle = useCallback((tx: Transaction): string => {
    switch (tx.txType) {
      case "Payment":
        return "송금";
      case "OfferCreate":
        return "거래 제안 생성";
      case "OfferCancel":
        return "거래 제안 취소";
      case "TrustSet":
        return "Trust Line";
      case "EscrowCreate":
        return "에스크로 생성";
      case "EscrowFinish":
        return "에스크로 완료";
      case "EscrowCancel":
        return "에스크로 취소";
      default:
        return tx.txType || "기타 거래";
    }
  }, []);

  // 거래 내역에 친구 이름 추가
  const processedTransactions = useMemo(() => {
    return transactions.map((tx) => {
      // 발신자 정보
      let fromName = "";
      let fromEmoji = "";

      if (tx.fromAddress === myWalletAddress) {
        fromName = "나";
      } else {
        const fromFriend = findFriendByAddress(tx.fromAddress);
        if (fromFriend) {
          fromName = fromFriend.nickname;
          fromEmoji = fromFriend.emoji || "";
        } else {
          fromName = formatAddress(tx.fromAddress);
        }
      }

      // 수신자 정보
      let toName = "";
      let toEmoji = "";

      if (tx.toAddress === myWalletAddress) {
        toName = "나";
      } else if (tx.toAddress) {
        const toFriend = findFriendByAddress(tx.toAddress);
        if (toFriend) {
          toName = toFriend.nickname;
          toEmoji = toFriend.emoji || "";
        } else {
          toName = formatAddress(tx.toAddress);
        }
      } else {
        // OfferCreate 등 상대방이 명확하지 않은 경우
        toName = "거래소";
      }

      // 거래 방향 결정 (Payment와 다른 트랜잭션 유형에 따라 다름)
      let isOutgoing = tx.fromAddress === myWalletAddress;
      let effectiveAmount = 0;

      if (tx.txType === "Payment") {
        effectiveAmount =
          tx.fromAddress === myWalletAddress
            ? -Math.abs(parseFloat(tx.amount))
            : Math.abs(parseFloat(tx.amount));
      } else if (tx.txType === "OfferCreate") {
        // OfferCreate는 항상 내가 제안하는 것이므로 outgoing으로 처리
        isOutgoing = true;
        effectiveAmount = -parseFloat(tx.fee || "0") / 1000000; // 수수료만 표시
      } else if (tx.txType === "TrustSet") {
        // 트러스트라인 설정은 금액 이동이 없으므로 0으로 처리
        effectiveAmount = 0;
      } else {
        // 기타 거래 유형에 대한 처리
        effectiveAmount = -parseFloat(tx.fee || "0") / 1000000; // 수수료만 표시
      }

      return {
        ...tx,
        fromName,
        fromEmoji,
        toName,
        toEmoji,
        // 거래 방향 (보낸 것인지 받은 것인지)
        isOutgoing,
        // 실제 금액 (보낸 경우 음수, 받은 경우 양수)
        effectiveAmount,
        // 아이콘 결정
        icon: TX_TYPE_ICONS[tx.txType] || TX_TYPE_ICONS.Default,
        // 트랜잭션 제목
        title: getTransactionTitle(tx),
      };
    });
  }, [
    myWalletAddress,
    transactions,
    formatAddress,
    findFriendByAddress,
    getTransactionTitle,
  ]);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast("주소가 복사되었습니다.", "success");
  };

  // 트랜잭션 상세 보기
  const handleShowTransactionDetail = (hash: string, status: string) => {
    console.log(hash, "hash");
    if (status === "success") {
      openTransactionDetail(hash);
    }
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

  // XRP 잔액 변환 함수 (drops -> XRP)
  const formatXrpBalance = (balanceInDrops: string): string => {
    // balance를 숫자로 변환하고 1,000,000으로 나누어 XRP 단위로 표시
    const balanceInXrp = parseFloat(balanceInDrops) / 1000000;
    return balanceInXrp.toLocaleString("ko-KR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  // 처음 컴포넌트 로드 시 친구 목록 가져오기
  useEffect(() => {
    try {
      const friendsData = localStorage.getItem("friends");
      if (friendsData) {
        setFriends(JSON.parse(friendsData));
      }
    } catch (error) {
      console.error("친구 목록 로딩 오류:", error);
    }
  }, []);

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

  const getTransactionStatus = (tx: Transaction): TransactionStatusResponse => {
    if (tx.txType === "EscrowCreate" && tx.isScheduled) {
      const now = Date.now();
      const finishAfter = new Date(tx.finishAfterTime!).getTime();

      if (now < finishAfter) {
        // 취소 가능 여부에 따라 표시 텍스트 결정
        return {
          text: tx.canCancel
            ? "⏳ 예약 중 (취소 가능)"
            : "⏳ 예약 중 (취소 불가)",
          className: styles.statusPending,
          isScheduled: true,
        };
      }
    }

    // 성공 여부에 따라 상태 표시
    if (tx.status === "success") {
      return { text: "✅ 완료", className: styles.statusSuccess };
    } else {
      return { text: "❌ 실패", className: styles.statusFailed };
    }
  };

  // OfferCreate 거래 정보 렌더링
  const renderOfferDetails = (tx: any) => {
    if (tx.txType !== "OfferCreate") return null;

    return (
      <div className={styles.offerDetails}>
        <div className={styles.offerItem}>
          <span className={styles.offerLabel}>제안:</span>
          <span className={styles.offerValue}>
            {formatTokenInfo(tx.takerGets)}
          </span>
        </div>
        <div className={styles.offerDivider}>→</div>
        <div className={styles.offerItem}>
          <span className={styles.offerLabel}>요청:</span>
          <span className={styles.offerValue}>
            {formatTokenInfo(tx.takerPays)}
          </span>
        </div>
      </div>
    );
  };

  // TrustSet 거래 정보 렌더링
  const renderTrustSetDetails = (tx: any) => {
    if (tx.txType !== "TrustSet" || !tx.limitAmount) return null;

    return (
      <div className={styles.trustSetDetails}>
        <div className={styles.trustItem}>
          <span className={styles.trustLabel}>통화:</span>
          <span className={styles.trustValue}>{tx.limitAmount.currency}</span>
        </div>
        <div className={styles.trustItem}>
          <span className={styles.trustLabel}>발행자:</span>
          <span className={styles.trustValue}>
            {formatAddress(tx.limitAmount.issuer)}
          </span>
          <button
            className={styles.copyButton}
            onClick={(e) => {
              e.stopPropagation();
              handleCopyAddress(tx.limitAmount.issuer);
            }}
            aria-label="주소 복사"
          >
            [복사]
          </button>
        </div>
        <div className={styles.trustItem}>
          <span className={styles.trustLabel}>신뢰 한도:</span>
          <span className={styles.trustValue}>
            {parseFloat(tx.limitAmount.value).toLocaleString()}{" "}
            {tx.limitAmount.currency}
          </span>
        </div>
      </div>
    );
  };

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
            onClick={() => handleShowTransactionDetail(tx.hash, tx.status)}
          >
            <div className={styles.cardHeader}>
              <div className={styles.transactionType}>
                <span className={styles.typeIcon}>{tx.icon}</span>
                <span className={styles.typeText}>{tx.title}</span>
              </div>
              <div className={styles.dateTime}>
                <span className={styles.dateIcon}>📅</span>
                {dayjs(tx.timestamp).format("YYYY-MM-DD (HH:mm)")}
              </div>
              <div
                className={`${styles.status} ${
                  getTransactionStatus(tx).className
                }`}
              >
                {getTransactionStatus(tx).text}
              </div>
            </div>

            <div className={styles.transactionDetails}>
              {tx.txType === "Payment" && (
                <div className={styles.participants}>
                  <div className={styles.participant}>
                    <div className={styles.participantLabel}>보낸 사람</div>
                    <div className={styles.participantValue}>
                      {tx.fromEmoji && (
                        <span className={styles.participantEmoji}>
                          {tx.fromEmoji}
                        </span>
                      )}
                      <span className={tx.fromName === "나" ? styles.isMe : ""}>
                        {tx.fromName}
                      </span>
                      {tx.fromName !== "나" &&
                        !findFriendByAddress(tx.fromAddress) && (
                          <button
                            className={styles.copyButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyAddress(tx.fromAddress);
                            }}
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
                      {tx.toEmoji && (
                        <span className={styles.participantEmoji}>
                          {tx.toEmoji}
                        </span>
                      )}
                      <span className={tx.toName === "나" ? styles.isMe : ""}>
                        {tx.toName}
                      </span>
                      {tx.toName !== "나" &&
                        tx.toAddress &&
                        !findFriendByAddress(tx.toAddress) && (
                          <button
                            className={styles.copyButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyAddress(tx.toAddress);
                            }}
                            aria-label="주소 복사"
                          >
                            [복사]
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* OfferCreate 세부 정보 */}
              {renderOfferDetails(tx)}

              {/* TrustSet 세부 정보 */}
              {renderTrustSetDetails(tx)}

              {/* 금액 표시 (Payment 거래만) */}
              {tx.txType === "Payment" && (
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
                    {formatXrpBalance(tx.effectiveAmount.toString())} XRP
                  </span>

                  {xrpPriceInfo && (
                    <span className={styles.amountInKrw}>
                      (
                      {convertXrpToKrw(
                        Math.abs(
                          parseFloat(
                            formatXrpBalance(tx.effectiveAmount.toString())
                          )
                        ),
                        xrpPriceInfo
                      )}
                      )
                    </span>
                  )}
                </div>
              )}

              {/* 수수료 정보 (모든 거래) */}
              {tx.status === "success" && (
                <div className={styles.feeInfo}>
                  <span className={styles.feeLabel}>수수료:</span>
                  <span className={styles.feeValue}>
                    {tx.fee ? parseFloat(tx.fee) / 1000000 : 0} XRP
                  </span>
                </div>
              )}
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
