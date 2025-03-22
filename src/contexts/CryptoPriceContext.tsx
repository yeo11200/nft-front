import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getXrpPrice, XrpPriceInfo } from "../services/crypto-price.service";

// Context에서 제공할 타입 정의
interface CryptoPriceContextType {
  xrpPriceInfo: XrpPriceInfo | null;
  loading: boolean;
  error: string | null;
  refreshPrice: () => Promise<void>;
}

// Context 생성
const CryptoPriceContext = createContext<CryptoPriceContextType | undefined>(
  undefined
);

// Provider 컴포넌트
export const CryptoPriceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [xrpPriceInfo, setXrpPriceInfo] = useState<XrpPriceInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // XRP 시세 정보 가져오기
  const fetchXrpPrice = async () => {
    try {
      setLoading(true);
      const data = await getXrpPrice();
      setXrpPriceInfo(data);
      setError(null);
    } catch (err) {
      setError("시세 정보를 불러오는데 실패했습니다.");
      console.error("XRP 시세 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시와 주기적으로 가격 정보 업데이트
  useEffect(() => {
    fetchXrpPrice();
  }, []);

  // 외부에서 수동으로 가격 정보를 갱신할 수 있는 함수
  const refreshPrice = async () => {
    await fetchXrpPrice();
  };

  // Context 값 정의
  const value = {
    xrpPriceInfo,
    loading,
    error,
    refreshPrice,
  };

  return (
    <CryptoPriceContext.Provider value={value}>
      {children}
    </CryptoPriceContext.Provider>
  );
};

// Hook을 통해 쉽게 Context에 접근
export const useCryptoPrice = () => {
  const context = useContext(CryptoPriceContext);
  if (context === undefined) {
    throw new Error(
      "useCryptoPrice는 CryptoPriceProvider 내부에서 사용해야 합니다."
    );
  }
  return context;
};
