import React, { useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner"; // qr-scanner 라이브러리 가져오기
import fetchApi from "../../utils/fetch-api";
import { VerificationResponse } from "../TicketManager";
import localStorageUtil from "../../utils/local-storage";

const TicketVerifier = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null); // 비디오 엘리먼트 참조
  const [verificationResult, setVerificationResult] = useState<string | null>(
    null
  );
  const [eventSymbol] = useState<string>(
    localStorageUtil.get("eventsymbol") || ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // 검증 중인지 여부

  const handleVerifyTicket = useCallback(
    async (scannedData: string) => {
      try {
        const { userId, ticketId } = JSON.parse(scannedData);

        console.log({
          user_id: userId,
          event_symbol: eventSymbol,
          ticket_id: ticketId, // 문자열로 변환
        });

        const response = await fetchApi<VerificationResponse>(
          "/ticket/verify",
          {
            method: "POST",
            body: {
              user_id: userId,
              event_symbol: eventSymbol,
              ticket_id: `${ticketId}`, // 문자열로 변환
            },
          }
        );
        setVerificationResult(
          `티켓 검증 성공: ${response.data.event_name}, 상태: ${response.data.status}`
        );
      } catch (err: any) {
        setError(err.message || "티켓 검증에 실패했습니다.");
      }
    },
    [eventSymbol]
  );

  useEffect(() => {
    if (videoRef.current) {
      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (!isProcessing) {
            console.log("QR Code Result:", result.data);
            setIsProcessing(true); // 처리 중으로 설정
            handleVerifyTicket(result.data);
            setTimeout(() => {
              setIsProcessing(false); // 10초 후 다시 처리 가능
            }, 10000);
          }
        },
        {
          highlightScanRegion: true, // 스캔 영역 강조
          highlightCodeOutline: true, // QR 코드 경계 강조
        }
      );

      qrScanner.start().catch((err) => {
        console.error("QR Scanner Error:", err);
        setError("QR 스캐너를 초기화하는 중 오류가 발생했습니다.");
      });

      // 컴포넌트가 언마운트될 때 스캐너 정리
      return () => {
        qrScanner.stop();
      };
    }
  }, [handleVerifyTicket, isProcessing]);

  return (
    <div>
      <h1>QR 코드 티켓 검증</h1>
      <video
        ref={videoRef}
        style={{ width: "100%", maxWidth: "400px" }}
        muted
        playsInline
      />
      {verificationResult && <p>{verificationResult}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default TicketVerifier;
