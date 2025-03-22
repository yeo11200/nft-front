import { motion, AnimatePresence } from "framer-motion";
import styles from "./Wallet.module.scss";
import { useUI } from "../../contexts/UIContext";
import { useCallback, useEffect, useState } from "react";
import { AccountResponseDto } from "@/types/account/response.dto";
import { useXrplAccount } from "../../hooks/useXrplAccount";
import { useSpinner } from "../../contexts/SpinnerContext";
import { useCryptoPrice } from "../../contexts/CryptoPriceContext";
import { convertXrpToKrw } from "../../utils/common";
import { useTokenInput } from "../../contexts/TokenInputContext";
// 토큰 인터페이스 정의
interface TokenType {
  account: string;
  balance: string;
  currency: string;
  limit: string;
  limit_peer: string;
  no_ripple?: boolean;
  no_ripple_peer?: boolean;
  quality_in?: number;
  quality_out?: number;
}

const Wallet = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [tokens, setTokens] = useState<TokenType[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenType | null>(null);
  const { openTokenInput } = useTokenInput();

  const [accountData, setAccountData] = useState<AccountResponseDto["account"]>(
    {
      address: "",
      secret: "",
      balance: "0",
    }
  );
  const { getAccountInfo, getFTsByIssuer } = useXrplAccount();
  const { showSpinner, hideSpinner } = useSpinner();
  const { xrpPriceInfo } = useCryptoPrice();
  const { toast } = useUI();

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

  // 계정 정보 가져오기
  const fetchAccountInfo = useCallback(
    async (address: string, secret: string) => {
      try {
        setIsLoading(true);
        showSpinner("계정 정보 로드 중...");
        const data = await getAccountInfo(address, secret);
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

  const fetchTokens = useCallback(
    async (address: string) => {
      try {
        const result = await getFTsByIssuer(address);
        if (result.success) {
          console.log("토큰 목록:", result.tokens);
          setTokens(result.tokens as TokenType[]);
        }
      } catch (error) {
        console.error("토큰 목록 조회 실패:", error);
      }
    },
    [getFTsByIssuer]
  );

  // 계좌번호 복사 함수
  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast("계좌번호가 복사되었습니다.", "success");
      })
      .catch((err) => {
        console.error("클립보드 복사 실패:", err);
        toast("계좌번호 복사에 실패했습니다.", "error");
      });
  };

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
          // null 반환을 피하고 항상 유효한 객체 반환
          return { ...prevAccount, balance };
        });
      }
    };

    // 알림 이벤트 리스너
    const handleNotification = (event: CustomEvent) => {
      const { message, type, amount } = event.detail;

      // 메시지가 직접 제공된 경우
      if (message) {
        toast(message, type === "incoming" ? "success" : "info");
      } else {
        // 이전 방식의 알림 처리 (호환성 유지)
        if (type === "incoming") {
          toast(`${amount} XRP를 받았습니다.`, "success");
        } else if (type === "outgoing") {
          toast(`${amount} XRP를 보냈습니다.`, "info");
        }
      }
    };

    fetchTokens(accountData.address);

    // 이벤트 리스너 등록
    window.addEventListener(
      "xrpl:balanceUpdate",
      handleBalanceUpdate as EventListener
    );

    window.addEventListener(
      "xrpl:notification",
      handleNotification as EventListener
    );

    // 컴포넌트 언마운트시 이벤트 리스너 제거
    return () => {
      window.removeEventListener(
        "xrpl:balanceUpdate",
        handleBalanceUpdate as EventListener
      );
      window.removeEventListener(
        "xrpl:notification",
        handleNotification as EventListener
      );
    };
  }, [accountData, fetchTokens, toast]);

  // 토큰 상세 모달 열기/닫기
  const openTokenDetail = (token: TokenType) => {
    setSelectedToken(token);
  };

  const closeTokenDetail = () => {
    setSelectedToken(null);
  };

  // 토큰 주소 포맷팅
  const formatAddress = (address: string): string => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Context API를 통한 팝업 열기
  const handleOpenPopup = (currency: string, account: string) => {
    openTokenInput(
      currency,
      "🌐",
      account,
      undefined,
      undefined,
      (xrpAmount, tokenAmount) => {
        console.log(xrpAmount, tokenAmount);
        fetchAccountInfo(accountData.address, accountData.secret);
      }
    );
  };

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
              <button
                className={styles.copyButton}
                onClick={() => copyToClipboard(accountData.address)}
              >
                복사
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* FT 토큰 섹션 */}
      <motion.div
        className={styles.tokenSection}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        <h2 className={styles.sectionTitle}>
          <span className={styles.emoji}>🪙</span> FT 토큰 목록
        </h2>

        {tokens.length > 0 ? (
          <div className={styles.tokenGrid}>
            {tokens.map((token, index) => (
              <motion.div
                key={`${token.currency}-${index}`}
                className={styles.tokenCard}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openTokenDetail(token)}
              >
                <div className={styles.tokenHeader}>
                  <div className={styles.tokenName}>
                    {token.currency || "Unknown"}
                  </div>
                  <div className={styles.tokenEmoji}>🌐</div>
                </div>

                <div className={styles.tokenInfo}>
                  <div className={styles.tokenInfoRow}>
                    <span className={styles.tokenLabel}>🔑 계좌:</span>
                    <span className={styles.tokenValue}>
                      {formatAddress(token.account)}
                      <button
                        className={styles.copyButton}
                        onClick={(e) => {
                          e.stopPropagation(); // 클릭 이벤트 전파 방지
                          copyToClipboard(token.account);
                        }}
                      >
                        복사
                      </button>
                    </span>
                  </div>

                  <div className={styles.tokenInfoRow}>
                    <span className={styles.tokenLabel}>💰 보유량:</span>
                    <span className={styles.tokenValue}>
                      {token.balance} {token.currency}
                    </span>
                  </div>

                  <div className={styles.tokenInfoRow}>
                    <span className={styles.tokenLabel}>📌 한도:</span>
                    <span className={styles.tokenValue}>{token.limit}</span>
                  </div>

                  <div className={styles.tokenInfoRow}>
                    <span className={styles.tokenLabel}>🚫 Ripple:</span>
                    <span
                      className={`${styles.tokenValue} ${
                        token.no_ripple ? styles.inactive : styles.active
                      }`}
                    >
                      {token.no_ripple ? "비활성화" : "활성화"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyTokens}>
            <p>보유한 FT 토큰이 없습니다.</p>
          </div>
        )}
      </motion.div>

      {/* 토큰 상세 모달 */}
      <AnimatePresence>
        {selectedToken && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeTokenDetail}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.closeButton} onClick={closeTokenDetail}>
                ×
              </button>

              <div className={styles.modalHeader}>
                <h3>🔍 {selectedToken.currency} 상세 정보</h3>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.modalSection}>
                  <h4>🔗 전체 계좌번호</h4>
                  <div className={styles.addressFull}>
                    {selectedToken.account}
                    <button
                      className={styles.copyButton}
                      onClick={() => copyToClipboard(selectedToken.account)}
                    >
                      복사
                    </button>
                  </div>
                </div>

                <div className={styles.modalSection}>
                  <h4>💰 보유량</h4>
                  <p>
                    {selectedToken.balance} {selectedToken.currency}
                  </p>
                </div>

                <div className={styles.modalSection}>
                  <h4>📊 거래 한도 설정</h4>
                  <div className={styles.limitInfo}>
                    <div className={styles.limitRow}>
                      <span>전체 한도:</span>
                      <span>{selectedToken.limit}</span>
                    </div>
                    <div className={styles.limitRow}>
                      <span>상대(peer) 한도:</span>
                      <span>{selectedToken.limit_peer || "없음"}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.modalSection}>
                  <h4>🌐 Ripple 기능</h4>
                  <div className={styles.rippleInfo}>
                    <div className={styles.rippleRow}>
                      <span>내 설정:</span>
                      <span
                        className={
                          selectedToken.no_ripple
                            ? styles.inactive
                            : styles.active
                        }
                      >
                        {selectedToken.no_ripple ? "OFF" : "ON"}
                      </span>
                    </div>
                    <div className={styles.rippleRow}>
                      <span>상대 설정:</span>
                      <span
                        className={
                          selectedToken.no_ripple_peer
                            ? styles.inactive
                            : styles.active
                        }
                      >
                        {selectedToken.no_ripple_peer ? "OFF" : "ON"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.modalSection}>
                  <h4>📈 품질 설정</h4>
                  <div className={styles.qualityInfo}>
                    <div className={styles.qualityRow}>
                      <span>Quality In:</span>
                      <span>{selectedToken.quality_in || "0"}</span>
                    </div>
                    <div className={styles.qualityRow}>
                      <span>Quality Out:</span>
                      <span>{selectedToken.quality_out || "0"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={styles.modalFooter}
                onClick={() =>
                  handleOpenPopup(selectedToken.currency, selectedToken.account)
                }
              >
                <button className={styles.actionButton}>➡️ 송금하기</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Wallet;
