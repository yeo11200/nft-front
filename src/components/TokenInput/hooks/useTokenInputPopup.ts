import { useState, useEffect, useRef } from "react";
import { useTokenInput } from "../../../contexts/TokenInputContext";

export interface TokenInputPopupProps {
  initialXrpAmount?: string;
  initialTokenAmount?: string;
  useProps?: boolean;
  onConfirmOverride?: (xrpAmount: string, tokenAmount: string) => void;
}

export const useTokenInputPopup = ({
  initialXrpAmount,
  initialTokenAmount,
  useProps = false,
  onConfirmOverride,
}: TokenInputPopupProps) => {
  const {
    popupState,
    closeTokenInput,
    xrpAmount: contextXrpAmount,
    tokenAmount: contextTokenAmount,
    setXrpAmount: setContextXrpAmount,
    setTokenAmount: setContextTokenAmount,
    handleConfirm: contextHandleConfirm,
  } = useTokenInput();

  const [localXrpAmount, setLocalXrpAmount] = useState<string>(
    initialXrpAmount || popupState.initialXrpAmount || ""
  );
  const [localTokenAmount, setLocalTokenAmount] = useState<string>(
    initialTokenAmount || popupState.initialTokenAmount || ""
  );

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

  const handleConfirm = () => {
    if (useProps && onConfirmOverride) {
      onConfirmOverride(xrpAmount, tokenAmount);
      closeTokenInput();
    } else {
      contextHandleConfirm();
    }
  };

  useEffect(() => {
    if (useProps) {
      if (initialXrpAmount) {
        setLocalXrpAmount(initialXrpAmount);
      }
      if (initialTokenAmount) {
        setLocalTokenAmount(initialTokenAmount);
      }
    } else {
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

  useEffect(() => {
    if (popupState.isOpen && xrpInputRef.current) {
      xrpInputRef.current.focus();
    }
  }, [popupState.isOpen]);

  const validateNumericInput = (value: string): boolean => {
    return /^[0-9]*\.?[0-9]*$/.test(value);
  };

  const handleXrpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || validateNumericInput(value)) {
      setXrpAmount(value);
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || validateNumericInput(value)) {
      setTokenAmount(value);
    }
  };

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

  return {
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
  };
};
