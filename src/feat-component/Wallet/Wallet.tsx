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

const Wallet = () => {
  const [isLoading, setIsLoading] = useState(false);

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

  // 소켓에서 잔액 업데이트 이벤트 처리
  useEffect(() => {
    if (!accountData?.address) return;

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
    </div>
  );
};

export default Wallet;
