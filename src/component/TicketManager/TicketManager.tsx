import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react"; // React QR 코드 생성
import fetchApi from "../../utils/fetch-api";
import localStorageUtil from "../../utils/local-storage";
import { useNavigate } from "react-router-dom";

export type TicketResponse = {
  status: string;
  data: {
    ticket_id: number;
  };
};

export type VerificationResponse = {
  status: string;
  data: {
    event_name: string;
    ticket_id: number;
    status: string; // "Used" or "Unused"
  };
};

const TicketManager: React.FC = () => {
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

  const navigate = useNavigate();

  useEffect(() => {
    if (ticketId && frontImage && backImage) {
      setQrCode(JSON.stringify({ userId, ticketId }));
    }
  }, [ticketId, frontImage, backImage, userId]);

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

  return (
    <div>
      <h1>NFT 티켓 관리</h1>

      {/* 티켓 발행 버튼 (티켓 ID가 없을 경우에만 표시) */}
      {!ticketId && <button onClick={handleMintTicket}>티켓 발행</button>}

      {/* 발행된 티켓 정보 */}
      {ticketId && (
        <>
          <p>발행된 티켓 ID: {ticketId}</p>
          {qrCode && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <QRCodeCanvas value={qrCode} size={200} />
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "50px",
            }}
          >
            <h2>티켓 이미지</h2>
            {frontImage && (
              <img
                src={frontImage}
                alt="티켓 앞면"
                style={{ width: "200px" }}
              />
            )}
            {backImage && (
              <img src={backImage} alt="티켓 뒷면" style={{ width: "200px" }} />
            )}
          </div>
        </>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default TicketManager;
