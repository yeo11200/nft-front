import React, { createContext, useState, useContext, useCallback } from 'react';
import { Transaction, useXrplAccount } from '../hooks';
import TransactionDetail from '../components/TransactionDetail';

interface TransactionDetailContextType {
  openTransactionDetail: (hash: string) => void;
  closeTransactionDetail: () => void;
}

const TransactionDetailContext = createContext<TransactionDetailContextType | undefined>(undefined);

export const useTransactionDetail = (): TransactionDetailContextType => {
  const context = useContext(TransactionDetailContext);
  if (!context) {
    throw new Error('useTransactionDetail must be used within a TransactionDetailProvider');
  }
  return context;
};

export const TransactionDetailProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [, setTransactionHash] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { getTransactionDetails } = useXrplAccount();

  const openTransactionDetail = useCallback(async (hash: string) => {
    setTransactionHash(hash);
    setIsPopupOpen(true);
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getTransactionDetails(hash);
      
      if (result.success && result.transaction) {
        setTransactionData(result.transaction);
      } else {
        setError(result.message || '트랜잭션 정보를 가져오는데 실패했습니다.');
        setTransactionData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setTransactionData(null);
    } finally {
      setIsLoading(false);
    }
  }, [getTransactionDetails]);

  const closeTransactionDetail = useCallback(() => {
    setIsPopupOpen(false);
    setTransactionData(null);
  }, []);

  return (
    <TransactionDetailContext.Provider 
      value={{
        openTransactionDetail,
        closeTransactionDetail
      }}
    >
      {children}
      <TransactionDetail
        isOpen={isPopupOpen}
        transaction={transactionData}
        isLoading={isLoading}
        error={error}
        onClose={closeTransactionDetail}
      />
    </TransactionDetailContext.Provider>
  );
}; 