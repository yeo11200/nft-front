import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TicketResponse } from "../TicketManager";
import fetchApi from "../../../utils/fetch-api";
import localStorageUtil from "../../../utils/local-storage";

const useTicketManager = () => {
  const [userId] = useState<string>(localStorageUtil.get("uuid") || "");

  const [eventSymbol] = useState<string>(
    localStorageUtil.get("eventsymbol") || ""
  );

  const [ticketId, setTicketId] = useState<number | null>(() => {
    const savedTicketId: string = localStorageUtil.get("ticket_id") || "";
    return savedTicketId
      ? (parseInt(savedTicketId || "0", 10) as number)
      : null;
  });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frontImage, setFrontImage] = useState<string | null>(() =>
    localStorageUtil.get("front_image")
  );
  const [backImage, setBackImage] = useState<string | null>(() =>
    localStorageUtil.get("back_image")
  );
  const [currentView, setCurrentView] = useState<"front" | "back" | "qr">(
    "front"
  );
  const [rotationCount, setRotationCount] = useState(0);
  const [rotating, setRotating] = useState(false);

  const navigate = useNavigate();

  // 티켓 발행
  const handleMintTicket = async () => {
    try {
      const response = await fetchApi<TicketResponse>("/ticket/mint", {
        method: "POST",
        body: {
          user_id: userId,
          event_symbol: eventSymbol,
          front_image: process.env.REACT_APP_FRONT_IMAGE,
          back_image: process.env.REACT_APP_BACK_IMAGE,
        },
      });

      const newTicketId = response.data.ticket_id;

      // 로컬 스토리지에 저장
      localStorageUtil.set("ticket_id", newTicketId.toString());
      localStorageUtil.set("front_image", process.env.REACT_APP_FRONT_IMAGE);
      localStorageUtil.set("back_image", process.env.REACT_APP_BACK_IMAGE);

      setTicketId(newTicketId);
      setFrontImage(process.env.REACT_APP_FRONT_IMAGE || "");
      setBackImage(process.env.REACT_APP_BACK_IMAGE || "");
      setQrCode(JSON.stringify({ userId, ticketId: newTicketId }));
    } catch (err: any) {
      setError(err.message || "티켓 발행에 실패했습니다.");
    }
  };

  useEffect(() => {
    if (!userId) {
      navigate("/");
    }
  }, [userId, navigate]);

  // 3D 회전 애니메이션 variants
  const cardVariants = {
    front: (custom: number) => ({
      rotateY: custom * 360,
      transition: { duration: 0.7 },
    }),
    back: (custom: number) => ({
      rotateY: custom * 360 + 120,
      transition: { duration: 0.7 },
    }),
    qr: (custom: number) => ({
      rotateY: custom * 360 + 240,
      transition: { duration: 0.7 },
    }),
  };

  // 뷰 전환 함수
  const handleViewChange = () => {
    if (rotating) return;
    setRotating(true);

    const views: ("front" | "back" | "qr")[] = ["front", "back", "qr"];
    const currentIndex = views.indexOf(currentView);
    const nextIndex = (currentIndex + 1) % views.length;

    // front로 돌아갈 때 회전 카운트 증가
    if (nextIndex === 0) {
      setRotationCount((prev) => prev + 1);
    }

    setCurrentView(views[nextIndex]);
    setTimeout(() => setRotating(false), 700);
  };

  useEffect(() => {
    if (ticketId && frontImage && backImage) {
      setQrCode(JSON.stringify({ userId, ticketId }));
    }
  }, [ticketId, frontImage, backImage, userId]);

  return {
    ticketId,
    qrCode,
    error,
    frontImage,
    backImage,
    currentView,
    rotationCount,
    rotating,
    cardVariants,
    handleMintTicket,
    handleViewChange,
  };
};

export default useTicketManager;
