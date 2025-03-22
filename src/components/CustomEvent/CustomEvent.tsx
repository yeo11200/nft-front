import { useEffect } from "react";
import { useUI } from "../../contexts/UIContext";

export const CustomEvent = () => {
  const { toast } = useUI();

  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      const { type, amount, message } = event.detail;

      if (message) {
        toast(message, type === "incoming" ? "success" : "info");
      } else if (type === "incoming") {
        toast(`${amount} XRP가 입금되었습니다.`, "success");
      }
    };

    window.addEventListener(
      "xrpl:notification",
      handleNotification as EventListener
    );

    return () => {
      window.removeEventListener(
        "xrpl:notification",
        handleNotification as EventListener
      );
    };
  }, [toast]);

  return null;
};
