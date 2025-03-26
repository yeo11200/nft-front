import { ReactNode, createContext, useContext, useState } from "react";
import { useXrplAccount } from "../hooks/useXrplAccount";
import { useUI } from "./UIContext";
import { useSpinner } from "./SpinnerContext";
import TokenInputPopup, {
  TokenInputPopupProps,
} from "../components/TokenInput";

// TokenInputProvider의 Props 인터페이스를 확장
interface TokenInputProviderProps {
  children: ReactNode;
  popupProps?: TokenInputPopupProps;
}

interface TokenInputPopupState {
  isOpen: boolean;
  currency: string;
  currencyIcon: string;
  issuer?: string;
  initialXrpAmount?: string;
  initialTokenAmount?: string;
  onConfirm?: (xrpAmount: string, tokenAmount: string) => void;
}

interface TokenInputContextType {
  popupState: TokenInputPopupState;
  openTokenInput: (
    currency: string,
    currencyIcon: string,
    issuer?: string,
    initialXrpAmount?: string,
    initialTokenAmount?: string,
    onConfirm?: (xrpAmount: string, tokenAmount: string) => void
  ) => void;
  closeTokenInput: () => void;
  xrpAmount: string;
  tokenAmount: string;
  setXrpAmount: (amount: string) => void;
  setTokenAmount: (amount: string) => void;
  handleConfirm: () => void;
}

const initialState: TokenInputPopupState = {
  isOpen: false,
  currency: "",
  currencyIcon: "",
};

const TokenInputContext = createContext<TokenInputContextType | undefined>(
  undefined
);

export const TokenInputProvider: React.FC<TokenInputProviderProps> = ({
  children,
  popupProps,
}) => {
  const [popupState, setPopupState] =
    useState<TokenInputPopupState>(initialState);
  const [xrpAmount, setXrpAmount] = useState<string>("");
  const [tokenAmount, setTokenAmount] = useState<string>("");
  const { showSpinner, hideSpinner } = useSpinner();
  const { toast } = useUI();
  const { createOffer } = useXrplAccount();
  const openTokenInput = (
    currency: string,
    currencyIcon: string,
    issuer?: string,
    initialXrpAmount?: string,
    initialTokenAmount?: string,
    onConfirm?: (xrpAmount: string, tokenAmount: string) => void
  ) => {
    setPopupState({
      isOpen: true,
      currency,
      currencyIcon,
      issuer,
      initialXrpAmount,
      initialTokenAmount,
      onConfirm,
    });
    // 입력값 초기화 (초기값이 있다면 그 값으로 설정)
    setXrpAmount(initialXrpAmount || "");
    setTokenAmount(initialTokenAmount || "");
  };

  const closeTokenInput = () => {
    setPopupState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const handleConfirm = async () => {
    const userInfoStr = localStorage.getItem("userInfo");
    const accountData = userInfoStr ? JSON.parse(userInfoStr) : null;

    if (!accountData) {
      toast("계정 정보를 찾을 수 없습니다.", "error");
      return;
    }

    showSpinner(`${popupState.currency}구매 주문중...`);

    await createOffer({
      account: accountData.address,
      takerGets: xrpAmount,
      takerPays: {
        issuer: popupState.issuer,
        currency: popupState.currency,
        value: tokenAmount,
      },
      seed: accountData.secret,
    }).finally(() => {
      popupState.onConfirm?.(xrpAmount, tokenAmount);
      hideSpinner();
    });

    closeTokenInput();
  };

  const value = {
    popupState,
    openTokenInput,
    closeTokenInput,
    xrpAmount,
    tokenAmount,
    setXrpAmount,
    setTokenAmount,
    handleConfirm,
  };
  return (
    <TokenInputContext.Provider value={value as TokenInputContextType}>
      {children}
      {popupState.isOpen && <TokenInputPopup {...popupProps} />}
    </TokenInputContext.Provider>
  );
};

export const useTokenInput = (): TokenInputContextType => {
  const context = useContext(TokenInputContext);
  if (context === undefined) {
    throw new Error("useTokenInput must be used within a TokenInputProvider");
  }
  return context;
};

/*
사용 예제:

// 초기값 없이 사용하는 경우
const { openTokenInput } = useTokenInput();
openTokenInput(currency, "🌐", account, handleConfirm);

// 초기값을 설정하여 사용하는 경우
const { openTokenInput } = useTokenInput();
openTokenInput(currency, "🌐", account, handleConfirm, "50", "100");  // XRP 50, Token 100으로 초기화
*/
