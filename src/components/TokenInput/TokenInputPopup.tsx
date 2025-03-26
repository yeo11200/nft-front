import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../components/TokenInput/TokenInputPopup.module.scss";
import {
  useTokenInputPopup,
  TokenInputPopupProps,
} from "./hooks/useTokenInputPopup";

const TokenInputPopup: React.FC<TokenInputPopupProps> = (props) => {
  const {
    popupState,
    xrpAmount,
    tokenAmount,
    xrpInputRef,
    tokenInputRef,
    handleXrpChange,
    handleTokenChange,
    handleKeyDown,
    handleConfirm,
    closeTokenInput,
  } = useTokenInputPopup(props);

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
                <label htmlFor="xrpAmount">XRP 수량 (Taker Gets)</label>
                <div className={styles.inputContainer}>
                  <div className={styles.iconContainer}>
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
                  {popupState.currency} 수량 (Taker Pays)
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
