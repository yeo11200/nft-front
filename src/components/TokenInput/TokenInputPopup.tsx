import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTokenInput } from "../../contexts/TokenInputContext";
import styles from "./TokenInputPopup.module.scss";

// TokenInputPopup의 Props 인터페이스 정의
interface TokenInputPopupProps {
  initialXrpAmount?: string;
  initialTokenAmount?: string;
}

const TokenInputPopup: React.FC<TokenInputPopupProps> = ({
  initialXrpAmount: propsInitialXrpAmount,
  initialTokenAmount: propsInitialTokenAmount,
}) => {
  const {
    popupState,
    closeTokenInput,
    xrpAmount,
    tokenAmount,
    setXrpAmount,
    setTokenAmount,
    handleConfirm,
  } = useTokenInput();

  const xrpInputRef = useRef<HTMLInputElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);

  // 빠른 금액 선택 버튼
  const quickAmounts = ["1", "10", "100"];

  // 빠른 금액 선택 함수
  const handleQuickAmount = (amount: string) => {
    setTokenAmount(amount);
    // 선택 후 XRP 입력으로 포커스 이동
    if (xrpInputRef.current) {
      xrpInputRef.current.focus();
    }
  };

  // Context에서 제공된 초기값 설정
  useEffect(() => {
    if (popupState.isOpen) {
      // Context에서 제공된 초기값이 있는 경우 설정
      if (popupState.initialXrpAmount) {
        setXrpAmount(popupState.initialXrpAmount);
      }

      if (popupState.initialTokenAmount) {
        setTokenAmount(popupState.initialTokenAmount);
      }

      // props로 제공된 초기값이 있다면 Context의 초기값보다 우선순위가 높음
      if (propsInitialXrpAmount) {
        setXrpAmount(propsInitialXrpAmount);
      }

      if (propsInitialTokenAmount) {
        setTokenAmount(propsInitialTokenAmount);
      }
    }
  }, [
    popupState.isOpen,
    popupState.initialXrpAmount,
    popupState.initialTokenAmount,
    propsInitialXrpAmount,
    propsInitialTokenAmount,
    setXrpAmount,
    setTokenAmount,
  ]);

  // 팝업이 열릴 때 첫 번째 입력 필드에 자동 포커스
  useEffect(() => {
    if (popupState.isOpen && xrpInputRef.current) {
      xrpInputRef.current.focus();
    }
  }, [popupState.isOpen]);

  // 숫자만 입력받도록 검증하는 함수
  const validateNumericInput = (value: string): boolean => {
    return /^[0-9]*\.?[0-9]*$/.test(value);
  };

  // XRP 입력 핸들러
  const handleXrpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || validateNumericInput(value)) {
      setXrpAmount(value);
    }
  };

  // 토큰 입력 핸들러
  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || validateNumericInput(value)) {
      setTokenAmount(value);
    }
  };

  // Enter 키 눌렀을 때 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.currentTarget === xrpInputRef.current && tokenInputRef.current) {
        tokenInputRef.current.focus();
      } else if (e.currentTarget === tokenInputRef.current) {
        if (xrpAmount && tokenAmount) {
          handleConfirm();
        }
      }
    } else if (e.key === "Escape") {
      closeTokenInput();
    }
  };

  return (
    <AnimatePresence>
      {popupState.isOpen && (
        <div className={styles.overlay} onClick={closeTokenInput}>
          <motion.div
            className={styles.popup}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2>🔄 토큰 수량 입력하기</h2>
            </div>

            <div className={styles.content}>
              <div className={styles.inputGroup}>
                <label htmlFor="xrpAmount">① XRP 수량 (Taker Gets)</label>
                <div className={styles.inputContainer}>
                  <div className={styles.iconContainer}>
                    <span className={styles.currencyIcon}>💧</span>
                    <span className={styles.currencyLabel}>XRP</span>
                  </div>
                  <input
                    id="xrpAmount"
                    ref={xrpInputRef}
                    type="text"
                    inputMode="decimal"
                    value={xrpAmount}
                    onChange={handleXrpChange}
                    onKeyDown={handleKeyDown}
                    placeholder="50"
                    className={styles.amountInput}
                    autoComplete="off"
                    list="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-form-type="other"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="tokenAmount">
                  ② {popupState.currency} 수량 (Taker Pays)
                </label>
                <div className={styles.inputContainer}>
                  <div className={styles.iconContainer}>
                    <span className={styles.currencyIcon}>
                      {popupState.currencyIcon || "🌐"}
                    </span>
                    <span className={styles.currencyLabel}>
                      {popupState.currency}
                    </span>
                  </div>
                  <input
                    id="tokenAmount"
                    ref={tokenInputRef}
                    type="text"
                    inputMode="decimal"
                    value={tokenAmount}
                    onChange={handleTokenChange}
                    onKeyDown={handleKeyDown}
                    placeholder="50"
                    className={styles.amountInput}
                    autoComplete="off"
                    list="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-form-type="other"
                  />
                </div>

                {/* 빠른 금액 선택 버튼 */}
                <div className={styles.quickAmountButtons}>
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className={styles.quickAmountButton}
                      onClick={() => handleQuickAmount(amount)}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <button className={styles.cancelButton} onClick={closeTokenInput}>
                취소
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleConfirm}
                disabled={!xrpAmount || !tokenAmount}
              >
                확인✅
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TokenInputPopup;
