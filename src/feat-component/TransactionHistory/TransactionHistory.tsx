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

const TransactionHistory: React.FC = () => {
  const { toast } = useUI();
  const { showSpinner, hideSpinner } = useSpinner();
  const { getTransactionHistory, cancelEscrow } = useXrplAccount();
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
      } else {
        const toFriend = findFriendByAddress(tx.toAddress);
        if (toFriend) {
          toName = toFriend.nickname;
          toEmoji = toFriend.emoji || "";
        } else {
          toName = formatAddress(tx.toAddress);
        }
      }

      return {
        ...tx,
        fromName,
        fromEmoji,
        toName,
        toEmoji,
        // 거래 방향 (보낸 것인지 받은 것인지)
        isOutgoing: tx.fromAddress === myWalletAddress,
        // 실제 금액 (보낸 경우 음수, 받은 경우 양수)
        effectiveAmount:
          tx.fromAddress === myWalletAddress
            ? -Math.abs(parseFloat(tx.amount))
            : Math.abs(parseFloat(tx.amount)),
      };
    });
  }, [myWalletAddress, transactions, formatAddress, findFriendByAddress]);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast("주소가 복사되었습니다.", "success");
  };

  // 트랜잭션 상세 보기
  const handleShowTransactionDetail = (hash: string) => {
    openTransactionDetail(hash);
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

    return { text: "✅ 완료", className: styles.statusSuccess };
  };

  const handleCancel = async (
    txStatus: TransactionStatusResponse,
    originalTx: Transaction
  ) => {
    if (txStatus?.isScheduled && originalTx.sequence) {
      // 취소 가능한지 확인
      if (!originalTx.canCancel) {
        if (
          originalTx.finishAfterTime &&
          new Date(originalTx.finishAfterTime).getTime() <= Date.now()
        ) {
          toast("완료 시간이 이미 지났습니다. 취소할 수 없습니다.", "error");
        } else if (
          originalTx.cancelAfterTime &&
          new Date(originalTx.cancelAfterTime).getTime() > Date.now()
        ) {
          toast("아직 취소 가능 시간이 되지 않았습니다.", "error");
        } else {
          toast("현재 이 에스크로는 취소할 수 없습니다.", "error");
        }
        return;
      }

      try {
        // 현재 사용자 정보 가져오기
        const userInfo = localStorage.getItem("userInfo");
        if (!userInfo) {
          toast("사용자 정보를 찾을 수 없습니다.", "error");
          return;
        }

        const { secret, address } = JSON.parse(userInfo);

        // 자신의 송금만 취소 가능
        if (originalTx.fromAddress !== myWalletAddress) {
          toast("본인이 보낸 예약 송금만 취소할 수 있습니다.", "error");
          return;
        }

        showSpinner("예약 송금 취소 중...");

        const result = await cancelEscrow({
          ownerAddress: address,
          escrowSequence: originalTx.sequence,
          cancellerAddress: address,
          secret: secret,
        });

        hideSpinner();

        if (result.success) {
          toast("예약 송금이 취소되었습니다.", "success");
          // 거래 내역 새로고침
          fetchTransactionHistory(address);
        } else {
          toast(`취소 실패: ${result.message}`, "error");
        }
      } catch (error) {
        hideSpinner();
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        toast(`취소 중 오류 발생: ${errorMessage}`, "error");
      }
    }
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
            onClick={() => handleShowTransactionDetail(tx.hash)}
          >
            <div className={styles.cardHeader}>
              <div className={styles.dateTime}>
                <span className={styles.dateIcon}>📅</span>
                {dayjs(tx.timestamp).format("YYYY-MM-DD (HH:mm)")}
              </div>
              <div
                className={`${styles.status} ${
                  getTransactionStatus(tx).className
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel(getTransactionStatus(tx), tx);
                }}
              >
                {getTransactionStatus(tx).text}
              </div>
            </div>

            <div className={styles.transactionDetails}>
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
