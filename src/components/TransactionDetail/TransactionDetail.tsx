import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './TransactionDetail.module.scss';
import { Transaction } from '../../hooks/useXrplAccount';
import { useCryptoPrice } from '../../contexts/CryptoPriceContext';
import { convertXrpToKrw } from '../../utils/common';
import dayjs from 'dayjs';

interface Friend {
  nickname: string;
  address: string;
  emoji?: string;
}

interface TransactionDetailProps {
  isOpen: boolean;
  transaction: Transaction | null;
  isLoading?: boolean;
  error?: string | null;
  onClose: () => void;
}

const TransactionDetail: React.FC<TransactionDetailProps> = ({
  isOpen,
  transaction,
  isLoading,
  error,
  onClose,
}) => {
  const { xrpPriceInfo } = useCryptoPrice();
  const [myWalletAddress, setMyWalletAddress] = useState<string>('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [fromName, setFromName] = useState<string>('');
  const [toName, setToName] = useState<string>('');
  const [fromEmoji, setFromEmoji] = useState<string>('');
  const [toEmoji, setToEmoji] = useState<string>('');  
  const [effectiveAmount, setEffectiveAmount] = useState<number>(0);

  // 내 지갑 주소와 친구 목록 가져오기
  useEffect(() => {
    try {
      // 내 지갑 주소 가져오기
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const parsedInfo = JSON.parse(userInfo);
        setMyWalletAddress(parsedInfo.address);
      }

      // 친구 목록 가져오기
      const friendsData = localStorage.getItem('friends');
      if (friendsData) {
        setFriends(JSON.parse(friendsData));
      }
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    }
  }, []);

  // 주소로 친구 찾기
  const findFriendByAddress = useCallback((address: string): Friend | null => {
    return friends.find((friend) => friend.address === address) || null;
  }, [friends]);

  // 트랜잭션이 바뀌면 이름 정보 업데이트
  useEffect(() => {
    if (!transaction) return;

    // 발신자 정보
    if (transaction.fromAddress === myWalletAddress) {
      setFromName('나');
      setFromEmoji('');
    } else {
      const fromFriend = findFriendByAddress(transaction.fromAddress);
      if (fromFriend) {
        setFromName(fromFriend.nickname);
        setFromEmoji(fromFriend.emoji || '');
      } else {
        setFromName(formatAddress(transaction.fromAddress));
        setFromEmoji('');
      }
    }

    // 수신자 정보
    if (transaction.toAddress === myWalletAddress) {
      setToName('나');
      setToEmoji('');
    } else {
      const toFriend = findFriendByAddress(transaction.toAddress);
      if (toFriend) {
        setToName(toFriend.nickname);
        setToEmoji(toFriend.emoji || '');
      } else {
        setToName(formatAddress(transaction.toAddress));
        setToEmoji('');
      }
    }

    // 실제 금액 계산 (보낸 경우 음수, 받은 경우 양수)
    const amount = parseFloat(transaction.amount);
    setEffectiveAmount(
      transaction.fromAddress === myWalletAddress
        ? -Math.abs(amount)
        : Math.abs(amount)
    );
  }, [transaction, myWalletAddress, friends, findFriendByAddress]);

  const formatHash = (hash: string) => {
    if (!hash) return '';
    return hash.length > 16 ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : hash;
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // XRP 잔액 변환 함수 (drops -> XRP)
  const formatXrpBalance = (balanceInDrops: string | number): string => {
    // balance를 숫자로 변환하고 1,000,000으로 나누어 XRP 단위로 표시
    const balanceInXrp = parseFloat(balanceInDrops.toString()) / 1000000;
    return balanceInXrp.toLocaleString("ko-KR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return '';
    
    try {
      return dayjs(timestamp).format("YYYY-MM-DD (HH:mm)")
    } catch (e) {
      return timestamp;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('복사되었습니다!');
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  const openInExplorer = (txHash: string) => {
    if (!txHash) return;
    
    // Open XRP Ledger explorer for this transaction
    const explorerUrl = `https://testnet.xrpl.org/transactions/${txHash}`;
    window.open(explorerUrl, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay} onClick={onClose}>
          <motion.div
            className={styles.modalContainer}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2>트랜잭션 상세 정보</h2>
              <button className={styles.closeButton} onClick={onClose}>×</button>
            </div>
            
            {transaction ? (
              <div className={styles.content}>
                <div className={`${styles.statusBadge} ${styles[transaction.status]}`}>
                  {transaction.status === 'success' ? '성공' : '실패'}
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
                
                <div className={styles.detailRow}>
                  <div className={styles.label}>금액</div>
                  <div className={`${styles.value} ${styles.amount} ${effectiveAmount < 0 ? styles.negative : styles.positive}`}>
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
                                formatXrpBalance(transaction.amount)
                              )
                            ),
                            xrpPriceInfo
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className={styles.detailRow}>
                  <div className={styles.label}>보낸 사람</div>
                  <div className={`${styles.value} ${styles.address}`}>
                    {fromEmoji && <span className={styles.emoji}>{fromEmoji}</span>}
                    <span className={fromName === '나' ? styles.isMe : ''}>
                      {fromName}
                    </span>
                    {fromName !== '나' && !findFriendByAddress(transaction.fromAddress) && (
                      <button
                        className={styles.copyButton}
                        onClick={() => copyToClipboard(transaction.fromAddress)}
                      >
                        복사
                      </button>
                    )}
                  </div>
                </div>
                
                <div className={styles.detailRow}>
                  <div className={styles.label}>받는 사람</div>
                  <div className={`${styles.value} ${styles.address}`}>
                    {toEmoji && <span className={styles.emoji}>{toEmoji}</span>}
                    <span className={toName === '나' ? styles.isMe : ''}>
                      {toName}
                    </span>
                    {toName !== '나' && !findFriendByAddress(transaction.toAddress) && (
                      <button
                        className={styles.copyButton}
                        onClick={() => copyToClipboard(transaction.toAddress)}
                      >
                        복사
                      </button>
                    )}
                  </div>
                </div>
                
                <div className={styles.detailRow}>
                  <div className={styles.label}>시간</div>
                  <div className={styles.value}>
                    {formatDate(transaction.timestamp)}
                  </div>
                </div>
                
                {transaction.status === 'failed' && error && (
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
                  <div className={styles.errorMessage}>트랜잭션 정보를 불러올 수 없습니다.</div>
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