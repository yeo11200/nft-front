import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./TransactionDetail.module.scss";
import {
  useTransactionDetail,
  TransactionDetailProps,
} from "./hooks/useTransactionDetail";
import { convertXrpToKrw } from "../../utils/common";

const TransactionDetail = (props: TransactionDetailProps) => {
  const {
    xrpPriceInfo,
    fromName,
    toName,
    fromEmoji,
    toEmoji,
    effectiveAmount,
    findFriendByAddress,
    formatHash,
    formatAddress,
    formatXrpBalance,
    formatDate,
    copyToClipboard,
    openInExplorer,
    renderOfferDetails,
    renderTrustSetDetails,
    getTransactionTitle,
    TX_TYPE_ICONS,
    transaction,
    isLoading,
    error,
    onClose,
  } = useTransactionDetail(props);

  return (
    <AnimatePresence>
      {props.isOpen && (
        <div className={styles.overlay} onClick={onClose}>
          <motion.div
            className={styles.modalContainer}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2>트랜잭션 상세 정보</h2>
              <button className={styles.closeButton} onClick={onClose}>
                ×
              </button>
            </div>

            {transaction ? (
              <div className={styles.content}>
                <div className={styles.transactionType}>
                  <span className={styles.typeIcon}>
                    {TX_TYPE_ICONS[transaction.txType] || TX_TYPE_ICONS.Default}
                  </span>
                  <span className={styles.typeTitle}>
                    {getTransactionTitle(transaction.txType)}
                  </span>
                </div>

                <div
                  className={`${styles.statusBadge} ${
                    styles[transaction.status]
                  }`}
                >
                  {transaction.status === "success" ? "성공" : "실패"}
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.label}>트랜잭션 ID</div>
                  <div className={`${styles.value} ${styles.hash}`}>
                    <span>{formatHash(transaction.hash)}</span>
                    <button
                      className={styles.copyButton}
                      onClick={() => copyToClipboard(transaction.hash)}
                    >
                      복사
                    </button>
                  </div>
                </div>

                {transaction.txType === "Payment" && (
                  <div className={styles.detailRow}>
                    <div className={styles.label}>금액</div>
                    <div
                      className={`${styles.value} ${styles.amount} ${
                        effectiveAmount < 0 ? styles.negative : styles.positive
                      }`}
                    >
                      <span className={styles.amountIcon}>
                        {effectiveAmount < 0 ? "💸" : "💰"}
                      </span>
                      <div className={styles.amountContainer}>
                        <span className={styles.amountValue}>
                          {effectiveAmount > 0 ? "+" : ""}
                          {formatXrpBalance(effectiveAmount)} XRP
                        </span>

                        {xrpPriceInfo && (
                          <span className={styles.amountInKrw}>
                            {convertXrpToKrw(
                              Math.abs(
                                parseFloat(
                                  formatXrpBalance(effectiveAmount.toString())
                                )
                              ),
                              xrpPriceInfo
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {transaction.txType === "OfferCreate" && (
                  <div className={styles.offerDetails}>
                    {(() => {
                      const details = renderOfferDetails(transaction);
                      if (!details) return null;
                      return (
                        <>
                          <div className={styles.offerRow}>
                            <div className={styles.offerLabel}>제안:</div>
                            <div className={styles.offerValue}>
                              {details.takerGets}
                            </div>
                          </div>
                          <div className={styles.offerDivider}>→</div>
                          <div className={styles.offerRow}>
                            <div className={styles.offerLabel}>요청:</div>
                            <div className={styles.offerValue}>
                              {details.takerPays}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {transaction.txType === "TrustSet" && (
                  <div className={styles.trustSetDetails}>
                    {(() => {
                      const details = renderTrustSetDetails(transaction);
                      if (!details) return null;
                      return (
                        <>
                          <div className={styles.trustRow}>
                            <div className={styles.trustLabel}>통화:</div>
                            <div className={styles.trustValue}>
                              {details.currency}
                            </div>
                          </div>
                          <div className={styles.trustRow}>
                            <div className={styles.trustLabel}>발행자:</div>
                            <div className={styles.trustValue}>
                              <span>{formatAddress(details.issuer)}</span>
                              <button
                                className={styles.copyButton}
                                onClick={() => copyToClipboard(details.issuer)}
                              >
                                복사
                              </button>
                            </div>
                          </div>
                          <div className={styles.trustRow}>
                            <div className={styles.trustLabel}>신뢰 한도:</div>
                            <div className={styles.trustValue}>
                              {details.value} {details.currency}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className={styles.detailRow}>
                  <div className={styles.label}>보낸 사람</div>
                  <div className={`${styles.value} ${styles.address}`}>
                    {fromEmoji && (
                      <span className={styles.emoji}>{fromEmoji}</span>
                    )}
                    <span className={fromName === "나" ? styles.isMe : ""}>
                      {fromName}
                    </span>
                    {fromName !== "나" &&
                      !findFriendByAddress(transaction.fromAddress) && (
                        <button
                          className={styles.copyButton}
                          onClick={() =>
                            copyToClipboard(transaction.fromAddress)
                          }
                        >
                          복사
                        </button>
                      )}
                  </div>
                </div>

                {transaction.toAddress && (
                  <div className={styles.detailRow}>
                    <div className={styles.label}>받는 사람</div>
                    <div className={`${styles.value} ${styles.address}`}>
                      {toEmoji && (
                        <span className={styles.emoji}>{toEmoji}</span>
                      )}
                      <span className={toName === "나" ? styles.isMe : ""}>
                        {toName}
                      </span>
                      {toName !== "나" &&
                        toName !== "거래소" &&
                        !findFriendByAddress(transaction.toAddress) && (
                          <button
                            className={styles.copyButton}
                            onClick={() =>
                              copyToClipboard(transaction.toAddress)
                            }
                          >
                            복사
                          </button>
                        )}
                    </div>
                  </div>
                )}

                <div className={styles.detailRow}>
                  <div className={styles.label}>시간</div>
                  <div className={styles.value}>
                    {formatDate(transaction.timestamp)}
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.label}>수수료</div>
                  <div className={styles.value}>
                    {transaction.fee
                      ? parseFloat(transaction.fee) / 1000000
                      : 0}{" "}
                    XRP
                  </div>
                </div>

                {transaction.status === "failed" && error && (
                  <div className={`${styles.detailRow} ${styles.error}`}>
                    <div className={styles.label}>실패 원인</div>
                    <div className={`${styles.value} ${styles.errorMessage}`}>
                      {error || "알 수 없는 오류"}
                    </div>
                  </div>
                )}

                <div className={styles.actions}>
                  <button
                    className={styles.explorerButton}
                    onClick={() => openInExplorer(transaction.hash)}
                  >
                    Explorer에서 보기
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.loadingContainer}>
                {isLoading ? (
                  <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <span>로딩 중...</span>
                  </div>
                ) : error ? (
                  <div className={styles.errorMessage}>{error}</div>
                ) : (
                  <div className={styles.errorMessage}>
                    트랜잭션 정보를 불러올 수 없습니다.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TransactionDetail;
