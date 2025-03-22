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
import { handleRegistration, handleAuthentication } from "../../utils/auto";
import { useNavigate } from "react-router-dom";

export interface Friend {
  nickname: string;
  address: string;
  emoji: string;
}

const Wallet = () => {
  const [isLoading, setIsLoading] = useState(false);

  const { openTransactionDetail } = useTransactionDetail();
  const navigate = useNavigate();
  const [accountData, setAccountData] = useState<AccountResponseDto["account"]>(
    {
      address: "",
      secret: "",
      balance: "0",
    }
  );
  const friends = JSON.parse(localStorage.getItem("friends") || "[]");
  const { sendPayment, getAccountInfo, sendPayment2 } = useXrplAccount();
  const { showSpinner, hideSpinner } = useSpinner();
  const { xrpPriceInfo } = useCryptoPrice();
  const { toast, confirm } = useUI();

  // 랜덤 XRP 개수 생성 함수 (1~7개)
  const generateRandomXrpAmount = (): number => {
    return Math.floor(Math.random() * 7) + 1; // 1부터 7까지 랜덤 정수
  };

  const handleSendPayment = async (friend: Friend) => {
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
            showSpinner("생체 인증 중...");

            // 생체 인증 지원 여부 확인
            if (!window.PublicKeyCredential) {
              toast("이 브라우저는 생체 인증을 지원하지 않습니다.", "error");
              hideSpinner();
              return false;
            }

            try {
              const nickname = localStorage.getItem("userInfo")
                ? JSON.parse(localStorage.getItem("userInfo")!).userId
                : "사용자";
              const address = accountData.address;

              let autoLogin = localStorage.getItem("autoLogin");
              // 생체 인증 등록 시도
              if (!autoLogin) {
                const credential = await handleRegistration(nickname, address);
                console.log("credential", credential);
                if (!credential) {
                  toast("생체 인증 등록에 실패했습니다.", "error");
                  return false;
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
                localStorage.setItem(
                  "autoLogin",
                  JSON.stringify(autoLoginData)
                );

                autoLogin = JSON.stringify(autoLoginData);
              }

              // 바로 인증 시도
              const authResult = await handleAuthentication(
                JSON.parse(autoLogin!).rawId
              );

              if (authResult) {
                // 인증 성공 - 송금 진행
                showSpinner("송금 중...");

                if (amount > 5) {
                  const res = await sendPayment2({
                    fromAddress: accountData.address,
                    toAddress: friend.address,
                    amount,
                    secret: accountData.secret,
                    scheduled: true,
                    scheduledDelay: 5,
                  });

                  if (res?.success) {
                    setTimeout(() => {
                      navigate("/transaction-history");
                    }, 1000);
                  }
                } else {
                  const res = await sendPayment({
                    fromAddress: accountData.address,
                    toAddress: friend.address,
                    amount,
                    secret: accountData.secret,
                  });

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

                  return true; // 송금 완료
                }
              } else {
                toast("생체 인증에 실패했습니다.", "error");
                return false;
              }
            } catch (error) {
              // 인증 실패 - 대부분 등록된 인증 정보가 없는 경우
              console.log("인증 시도 중 오류:", error);

              hideSpinner(); // 대화상자 표시 전에 스피너 숨기기

              // 생체 인증 등록 여부 확인
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
                toast(
                  "생체 인증 등록을 취소하여 송금이 취소되었습니다.",
                  "info"
                );
                return false;
              }

              // 생체 인증 등록 진행
              try {
                showSpinner("생체 인증 등록 중...");
                const nickname = localStorage.getItem("userInfo")
                  ? JSON.parse(localStorage.getItem("userInfo")!).userId
                  : "사용자";
                const address = accountData.address;

                // 생체 인증 등록 시도
                console.log("등록 시작: ", { nickname, address });
                const credential = await handleRegistration(nickname, address);
                console.log("등록 결과:", credential);

                if (!credential) {
                  toast("생체 인증 등록에 실패했습니다.", "error");
                  return false;
                }

                toast("생체 인증이 등록되었습니다.", "success");

                // 등록 직후 바로 송금 진행
                showSpinner("송금 중...");
                const res = await sendPayment({
                  fromAddress: accountData.address,
                  toAddress: friend.address,
                  amount: 1,
                  secret: accountData.secret,
                });

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

                return true;
              } catch (error) {
                console.error("생체 인증 등록 오류:", error);
                toast(
                  "생체 인증 등록에 실패했습니다: " +
                    (error instanceof Error
                      ? error.message
                      : "알 수 없는 오류"),
                  "error"
                );
                return false;
              }
            }
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
