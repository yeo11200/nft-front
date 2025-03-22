import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./FriendDetailModal.module.scss";
import { useXrplAccount } from "../../../hooks/useXrplAccount";
import { formatDateToKorean } from "../../../utils/common";
import { useUI } from "../../../contexts/UIContext";
import { useSpinner } from "../../../contexts/SpinnerContext";
import { AccountResponseDto } from "../../../types/account/response.dto";
import { handleAuthentication, handleRegistration } from "../../../utils/auto";

export interface Transaction {
  hash: string;
  amount: string;
  timestamp: string;
  fromAddress: string;
  toAddress: string;
  status: string;
}

export interface FriendDetailModalProps {
  friend: {
    nickname: string;
    address: string;
    emoji: string;
    isFavorite: boolean;
    transactionCount: number;
  };
  onClose: () => void;
  onResult: () => void;
}

export interface Friend {
  nickname: string;
  address: string;
  emoji: string;
  isFavorite: boolean;
  transactionCount: number;
}

const FriendDetailModal = ({
  friend,
  onClose,
  onResult,
}: FriendDetailModalProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [accountData, setAccountData] = useState<AccountResponseDto["account"]>(
    {
      address: "",
      secret: "",
      balance: "0",
    }
  );
  const [userAddress, setUserAddress] = useState<string>("");

  const { getTransactionHistory, sendPayment, getAccountInfo } =
    useXrplAccount();
  const { showSpinner, hideSpinner } = useSpinner();
  const { toast, confirm } = useUI();

  // XRP 단위 변환 (drops -> XRP)
  const dropsToXrp = (drops: string): string => {
    const xrpAmount = parseInt(drops) / 1000000;
    return xrpAmount.toFixed(6);
  };

  // 모달 외부 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 트랜잭션 내역 로드
  useEffect(() => {
    const loadTransactions = async () => {
      setIsLoading(true);

      try {
        const userInfo = localStorage.getItem("userInfo");
        if (!userInfo) return;

        const { address } = JSON.parse(userInfo);
        setUserAddress(address);

        const result = await getTransactionHistory(address);
        if (result.success) {
          // 해당 친구와의 거래 필터링
          const filteredTransactions = result.transactions
            .filter(
              (tx) =>
                (tx.fromAddress === address &&
                  tx.toAddress === friend.address) ||
                (tx.fromAddress === friend.address && tx.toAddress === address)
            )
            .sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            );

          setTransactions(filteredTransactions);
        }
      } catch (error) {
        console.error("트랜잭션 내역 로드 오류:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, [friend.address, getTransactionHistory]);

  // 트랜잭션 타입 및 방향 결정
  const getTransactionType = (tx: Transaction) => {
    const isSending = tx.fromAddress === userAddress;
    return isSending ? "송금" : "수신";
  };

  // 트랜잭션 방향에 따른 스타일 클래스
  const getTransactionClass = (tx: Transaction) => {
    const isSending = tx.fromAddress === userAddress;
    return isSending ? styles.sending : styles.receiving;
  };

  // 트랜잭션 아이콘
  const getTransactionIcon = (tx: Transaction) => {
    const isSending = tx.fromAddress === userAddress;
    return isSending ? "↗️" : "↘️";
  };

  // 랜덤 XRP 개수 생성 함수 (1~7개)
  const generateRandomXrpAmount = (): number => {
    return Math.floor(Math.random() * 7) + 1; // 1부터 7까지 랜덤 정수
  };

  // 생체 인증 지원 여부 확인
  const checkBiometricSupport = useCallback((): boolean => {
    if (!window.PublicKeyCredential) {
      toast("이 브라우저는 생체 인증을 지원하지 않습니다.", "error");
      return false;
    }
    return true;
  }, [toast]);

  // 사용자 정보 가져오기
  const getUserInfo = useCallback(() => {
    const userInfo = localStorage.getItem("userInfo");
    if (!userInfo) {
      toast("사용자 정보를 찾을 수 없습니다.", "error");
      return null;
    }

    return JSON.parse(userInfo);
  }, [toast]);

  // 생체 인증 등록
  const registerBiometric = useCallback(
    async (nickname: string, address: string) => {
      try {
        showSpinner("생체 인증 등록 중...");
        const credential = await handleRegistration(nickname, address);

        if (!credential) {
          toast("생체 인증 등록에 실패했습니다.", "error");
          return null;
        }

        const autoLoginData = {
          credentialId: credential.id,
          rawId: btoa(
            String.fromCharCode.apply(
              null,
              Array.from(new Uint8Array(credential.rawId))
            )
          ),
        };

        localStorage.setItem("autoLogin", JSON.stringify(autoLoginData));
        toast("생체 인증이 등록되었습니다.", "success");

        return autoLoginData;
      } catch (error) {
        console.error("생체 인증 등록 오류:", error);
        toast(
          "생체 인증 등록에 실패했습니다: " +
            (error instanceof Error ? error.message : "알 수 없는 오류"),
          "error"
        );
        return null;
      }
    },
    [toast, showSpinner]
  );

  // 송금 처리
  const processSendPayment = useCallback(
    async (fromAddress: string, secret: string, amount: number) => {
      showSpinner("송금 중...");

      try {
        const res = await sendPayment({
          fromAddress,
          toAddress: friend.address,
          amount,
          secret,
        });

        if (res?.transaction) {
          onResult();
        }

        const data = await getAccountInfo(accountData.address);
        if (data.account) {
          setAccountData((props) => ({
            ...props,
            balance: data?.account?.balance || "0",
          }));
        }

        return true;
      } catch (error) {
        console.error("송금 중 오류:", error);
        toast("송금에 실패했습니다.", "error");
        return false;
      }
    },
    [
      accountData,
      friend.address,
      getAccountInfo,
      onResult,
      sendPayment,
      showSpinner,
      toast,
    ]
  );

  // 생체 인증 및 송금 처리 (메인 함수)
  const authenticateAndSendPayment = useCallback(
    async (amount: number) => {
      if (!checkBiometricSupport()) return false;

      const userInfo = getUserInfo();
      if (!userInfo) return false;

      const { address, secret, userId = "사용자" } = userInfo;
      const nickname = userId;

      // 기존 생체 인증 정보 확인
      let autoLogin = localStorage.getItem("autoLogin");

      try {
        // 생체 인증 정보가 없으면 등록 진행
        if (!autoLogin) {
          const autoLoginData = await registerBiometric(nickname, address);
          if (!autoLoginData) return false;
          autoLogin = JSON.stringify(autoLoginData);
        }

        // 생체 인증 시도
        showSpinner("생체 인증 중...");
        const authResult = await handleAuthentication(
          JSON.parse(autoLogin).rawId
        );

        if (!authResult) {
          toast("생체 인증에 실패했습니다.", "error");
          return false;
        }

        // 송금 진행
        return await processSendPayment(address, secret, amount);
      } catch (error) {
        // 생체 인증 실패 - 대부분 등록된 인증 정보가 없는 경우
        console.log("인증 시도 중 오류:", error);
        hideSpinner();

        // 생체 인증 재등록 여부 확인
        const registerBio = await confirm(
          "생체 인증 등록",
          "송금을 위해서는 생체 인증이 필요합니다. 지금 등록하시겠습니까?",
          {
            confirmText: "등록하기",
            cancelText: "취소",
            confirmStyle: "primary",
          }
        );

        if (!registerBio) {
          toast("생체 인증 등록을 취소하여 송금이 취소되었습니다.", "info");
          return false;
        }

        // 생체 인증 등록 후 송금 시도
        const autoLoginData = await registerBiometric(nickname, address);
        if (!autoLoginData) return false;

        return await processSendPayment(address, secret, amount);
      }
    },
    [
      checkBiometricSupport,
      getUserInfo,
      showSpinner,
      processSendPayment,
      registerBiometric,
      toast,
      hideSpinner,
      confirm,
    ]
  );

  // 송금 버튼 클릭 처리
  const handleSendPayment = useCallback(
    async (friend: Friend) => {
      const amount = generateRandomXrpAmount();

      const result = await confirm(
        `송금 하실래요?`,
        `${friend.nickname}에게 ${amount} XRP를 보내는 작업을 준비했어요. 확인 버튼 클릭 시 생체 인증 후 송금이 진행됩니다.`,
        {
          confirmText: "송금",
          cancelText: "취소",
          confirmStyle: "primary",
          onConfirmAction: async () => {
            try {
              await authenticateAndSendPayment(amount);
              return true;
            } catch (error) {
              console.error("처리 중 오류:", error);
              toast("처리 중 오류가 발생했습니다.", "error");
              return false;
            } finally {
              hideSpinner();
            }
          },
        }
      );

      if (result) {
        console.log("송금 완료");
      }
    },
    [authenticateAndSendPayment, confirm, hideSpinner, toast]
  );

  // 소켓에서 잔액 업데이트 이벤트 처리
  useEffect(() => {
    if (!accountData?.address) {
      return;
    }

    // 잔액 업데이트 이벤트 리스너
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { address, balance } = event.detail;

      // 현재 계정의 잔액이 업데이트된 경우만 처리
      if (accountData && accountData.address === address) {
        setAccountData((prevAccount) => {
          return { ...prevAccount, balance };
        });
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener(
      "xrpl:balanceUpdate",
      handleBalanceUpdate as EventListener
    );
    // 컴포넌트 언마운트시 이벤트 리스너 제거
    return () => {
      window.removeEventListener(
        "xrpl:balanceUpdate",
        handleBalanceUpdate as EventListener
      );
    };
  }, [accountData]);

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <motion.div
        className={styles.modalContent}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>

        {/* 친구 정보 헤더 */}
        <div className={styles.friendHeader}>
          <div className={styles.friendEmoji}>{friend.emoji}</div>
          <div className={styles.friendInfo}>
            <h2 className={styles.friendName}>{friend.nickname}</h2>
            <div className={styles.friendAddress}>{friend.address}</div>
          </div>
        </div>

        {/* 거래 통계 */}
        <div className={styles.statsSection}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>총 거래 횟수</span>
            <span className={styles.statValue}>
              {friend.transactionCount}회
            </span>
          </div>
        </div>

        {/* 거래 내역 섹션 */}
        <div className={styles.transactionsSection}>
          <h3 className={styles.sectionTitle}>거래 내역</h3>

          {isLoading ? (
            <div className={styles.loading}>거래 내역 로딩 중...</div>
          ) : transactions.length > 0 ? (
            <div className={styles.transactionsList}>
              {transactions.map((tx) => (
                <motion.div
                  key={tx.hash}
                  className={`${styles.transactionItem} ${getTransactionClass(
                    tx
                  )}`}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedTransaction(tx)}
                >
                  <div className={styles.transactionIcon}>
                    {getTransactionIcon(tx)}
                  </div>
                  <div className={styles.transactionInfo}>
                    <div className={styles.transactionType}>
                      {getTransactionType(tx)}
                    </div>
                    <div className={styles.transactionDate}>
                      {formatDateToKorean(new Date(tx.timestamp))}
                    </div>
                  </div>
                  <div className={styles.transactionAmount}>
                    {getTransactionType(tx) === "송금" ? "-" : "+"}
                    {dropsToXrp(tx.amount)} XRP
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyTransactions}>
              <p>아직 거래 내역이 없습니다</p>
            </div>
          )}
        </div>

        {/* 트랜잭션 상세 정보 */}
        <AnimatePresence>
          {selectedTransaction && (
            <motion.div
              className={styles.transactionDetails}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className={styles.detailsHeader}>
                <h4>거래 상세 정보</h4>
                <button
                  className={styles.closeDetailsButton}
                  onClick={() => setSelectedTransaction(null)}
                >
                  ×
                </button>
              </div>
              <div className={styles.detailsContent}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>거래 번호</span>
                  <span className={styles.detailValue}>
                    {`${selectedTransaction.hash.substring(
                      0,
                      8
                    )}...${selectedTransaction.hash.substring(
                      selectedTransaction.hash.length - 8
                    )}`}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>금액</span>
                  <span className={styles.detailValue}>
                    {dropsToXrp(selectedTransaction.amount)} XRP
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>날짜</span>
                  <span className={styles.detailValue}>
                    {new Date(selectedTransaction.timestamp).toLocaleString(
                      "ko-KR"
                    )}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>보낸 사람</span>
                  <span className={styles.detailValue}>
                    {selectedTransaction.fromAddress === userAddress
                      ? "나"
                      : friend.nickname}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>받는 사람</span>
                  <span className={styles.detailValue}>
                    {selectedTransaction.toAddress === userAddress
                      ? "나"
                      : friend.nickname}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 송금 버튼 */}
        <div className={styles.actionButtons}>
          <motion.button
            className={styles.sendButton}
            onClick={() => handleSendPayment(friend)}
          >
            송금하기
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default FriendDetailModal;
