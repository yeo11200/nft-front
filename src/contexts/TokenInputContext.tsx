import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../components/TokenInput/TokenInputPopup.module.scss";
import { useXrplAccount } from "../hooks/useXrplAccount";
import { useUI } from "./UIContext";

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

// TokenInputPopup 컴포넌트의 Props 인터페이스 정의
interface TokenInputPopupProps {
  initialXrpAmount?: string;
  initialTokenAmount?: string;
  useProps?: boolean;
  onConfirmOverride?: (xrpAmount: string, tokenAmount: string) => void;
}

const initialState: TokenInputPopupState = {
  isOpen: false,
  currency: "",
  currencyIcon: "",
};

const TokenInputContext = createContext<TokenInputContextType | undefined>(
  undefined
);

// TokenInputPopup 컴포넌트 정의 - props 추가
const TokenInputPopup: React.FC<TokenInputPopupProps> = ({
  initialXrpAmount,
  initialTokenAmount,
  useProps = false,
  onConfirmOverride,
}) => {
  const {
    popupState,
    closeTokenInput,
    xrpAmount: contextXrpAmount,
    tokenAmount: contextTokenAmount,
    setXrpAmount: setContextXrpAmount,
    setTokenAmount: setContextTokenAmount,
    handleConfirm: contextHandleConfirm,
  } = useTokenInput();

  // props로 받은 값이 있으면 해당 값을 사용, 없으면 context 값 사용
  const [localXrpAmount, setLocalXrpAmount] = useState<string>(
    initialXrpAmount || popupState.initialXrpAmount || ""
  );
  const [localTokenAmount, setLocalTokenAmount] = useState<string>(
    initialTokenAmount || popupState.initialTokenAmount || ""
  );

  // 실제 사용할 값과 setter 함수 결정
  const xrpAmount = useProps ? localXrpAmount : contextXrpAmount;
  const tokenAmount = useProps ? localTokenAmount : contextTokenAmount;

  const setXrpAmount = (value: string) => {
    if (useProps) {
      setLocalXrpAmount(value);
    } else {
      setContextXrpAmount(value);
    }
  };

  const setTokenAmount = (value: string) => {
    if (useProps) {
      setLocalTokenAmount(value);
    } else {
      setContextTokenAmount(value);
    }
  };

  // 확인 처리 함수
  const handleConfirm = () => {
    if (useProps && onConfirmOverride) {
      onConfirmOverride(xrpAmount, tokenAmount);
      closeTokenInput();
    } else {
      contextHandleConfirm();
    }
  };

  // 컴포넌트가 마운트될 때 초기값 설정
  useEffect(() => {
    if (useProps) {
      // Props로 제공된 초기값 사용
      if (initialXrpAmount) {
        setLocalXrpAmount(initialXrpAmount);
      }
      if (initialTokenAmount) {
        setLocalTokenAmount(initialTokenAmount);
      }
    } else {
      // Context에서 제공된 초기값 사용
      if (popupState.initialXrpAmount) {
        setContextXrpAmount(popupState.initialXrpAmount);
      }
      if (popupState.initialTokenAmount) {
        setContextTokenAmount(popupState.initialTokenAmount);
      }
    }
  }, [
    initialXrpAmount,
    initialTokenAmount,
    popupState.initialXrpAmount,
    popupState.initialTokenAmount,
    useProps,
    setContextXrpAmount,
    setContextTokenAmount,
  ]);

  const xrpInputRef = useRef<HTMLInputElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);

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

// TokenInputProvider의 Props 인터페이스를 확장
interface TokenInputProviderProps {
  children: ReactNode;
  popupProps?: TokenInputPopupProps;
}

export const TokenInputProvider: React.FC<TokenInputProviderProps> = ({
  children,
  popupProps,
}) => {
  const [popupState, setPopupState] =
    useState<TokenInputPopupState>(initialState);
  const [xrpAmount, setXrpAmount] = useState<string>("");
  const [tokenAmount, setTokenAmount] = useState<string>("");
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
    console.log(
      currency,
      currencyIcon,
      issuer,
      onConfirm,
      initialXrpAmount,
      initialTokenAmount
    );
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
    console.log(popupState.issuer, xrpAmount, tokenAmount);

    const userInfoStr = localStorage.getItem("userInfo");
    const accountData = userInfoStr ? JSON.parse(userInfoStr) : null;

    if (!accountData) {
      toast("계정 정보를 찾을 수 없습니다.", "error");
      return;
    }

    await createOffer({
      account: accountData.address,
      takerGets: xrpAmount,
      takerPays: {
        issuer: popupState.issuer,
        currency: popupState.currency,
        value: tokenAmount,
      },
      seed: accountData.secret,
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

// TokenInputPopup 컴포넌트 노출시키기
export { TokenInputPopup };

/*
사용 예제:

// 초기값 없이 사용하는 경우
const { openTokenInput } = useTokenInput();
openTokenInput(currency, "🌐", account, handleConfirm);

// 초기값을 설정하여 사용하는 경우
const { openTokenInput } = useTokenInput();
openTokenInput(currency, "🌐", account, handleConfirm, "50", "100");  // XRP 50, Token 100으로 초기화
*/
