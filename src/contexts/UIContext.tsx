import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast } from "../components/common/Toast";
import { Alert } from "../components/common/Alert";
import { Confirm } from "../components/common/Confirm";

interface UIContextType {
  toast: (message: string, type?: "success" | "error" | "info") => void;
  alert: (
    title: string,
    message: string,
    type?: "success" | "error" | "info" | "warning"
  ) => Promise<void>;
  confirm: (
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      confirmStyle?: "primary" | "danger" | "warning";
      onConfirmAction?: () => void;
      onCancelAction?: () => void;
    }
  ) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toastState, setToastState] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    show: false,
    message: "",
    type: "info",
  });

  const [alertState, setAlertState] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
    resolve?: (value: void) => void;
  }>({
    show: false,
    title: "",
    message: "",
    type: "info",
  });

  const [confirmState, setConfirmState] = useState<{
    show: boolean;
    title: string;
    message: string;
    options?: {
      confirmText: string;
      cancelText: string;
      confirmStyle: "primary" | "danger" | "warning";
      onConfirmAction?: () => void;
      onCancelAction?: () => void;
    };
    resolve?: (value: boolean) => void;
  }>({
    show: false,
    title: "",
    message: "",
  });

  const toast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToastState({ show: true, message, type });
    },
    []
  );

  const alert = useCallback(
    (
      title: string,
      message: string,
      type: "success" | "error" | "info" | "warning" = "info"
    ): Promise<void> => {
      return new Promise((resolve) => {
        setAlertState({ show: true, title, message, type, resolve });
      });
    },
    []
  );

  const handleConfirmAction = useCallback(
    (confirmed: boolean) => {
      if (confirmed && confirmState.options?.onConfirmAction) {
        confirmState.options.onConfirmAction();
      } else if (!confirmed && confirmState.options?.onCancelAction) {
        confirmState.options.onCancelAction();
      }

      confirmState.resolve?.(confirmed);
      setConfirmState((prev) => ({ ...prev, show: false }));
    },
    [confirmState]
  );

  const confirm = useCallback(
    (
      title: string,
      message: string,
      options?: {
        confirmText?: string;
        cancelText?: string;
        confirmStyle?: "primary" | "danger" | "warning";
        onConfirmAction?: () => void;
        onCancelAction?: () => void;
      }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmState({
          show: true,
          title,
          message,
          options: {
            confirmText: options?.confirmText || "확인",
            cancelText: options?.cancelText || "취소",
            confirmStyle: options?.confirmStyle || "primary",
            onConfirmAction: options?.onConfirmAction,
            onCancelAction: options?.onCancelAction,
          },
          resolve,
        });
      });
    },
    []
  );

  const handleToastClose = useCallback(() => {
    setToastState((prev) => ({ ...prev, show: false }));
  }, []);

  const handleAlertClose = useCallback(() => {
    if (alertState.resolve) {
      alertState.resolve();
    }
    setAlertState((prev) => ({ ...prev, show: false }));
  }, [alertState]);

  return (
    <UIContext.Provider value={{ toast, alert, confirm }}>
      {children}
      {toastState.show && (
        <Toast
          message={toastState.message}
          type={toastState.type}
          onClose={handleToastClose}
        />
      )}
      {alertState.show && (
        <Alert
          title={alertState.title}
          message={alertState.message}
          type={alertState.type}
          onClose={handleAlertClose}
        />
      )}
      {confirmState.show && (
        <Confirm
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.options?.confirmText}
          cancelText={confirmState.options?.cancelText}
          confirmStyle={confirmState.options?.confirmStyle}
          onConfirm={() => handleConfirmAction(true)}
          onCancel={() => handleConfirmAction(false)}
        />
      )}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};
