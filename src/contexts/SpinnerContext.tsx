import React, { createContext, useContext, useState, ReactNode } from "react";
import { Spinner } from "../components/common/Spinner";

interface SpinnerContextType {
  showSpinner: (text?: string) => void;
  hideSpinner: () => void;
}

const SpinnerContext = createContext<SpinnerContextType | undefined>(undefined);

export const SpinnerProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string | undefined>(undefined);

  const showSpinner = (text?: string) => {
    setLoadingText(text);
    setLoading(true);
  };

  const hideSpinner = () => {
    setLoading(false);
  };

  return (
    <SpinnerContext.Provider value={{ showSpinner, hideSpinner }}>
      {children}
      {loading && <Spinner fullScreen text={loadingText} />}
    </SpinnerContext.Provider>
  );
};

export const useSpinner = () => {
  const context = useContext(SpinnerContext);
  if (context === undefined) {
    throw new Error("useSpinner must be used within a SpinnerProvider");
  }
  return context;
};
