import React from "react";
import { QRCodeCanvas } from "qrcode.react"; // React QR 코드 생성
import { motion } from "framer-motion";
import useTicketManager from "./hooks/useTickerManger";
import styles from "./TicketManager.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

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
  const {
    ticketId,
    qrCode,
    error,
    frontImage,
    backImage,
    currentView,
    rotationCount,
    cardVariants,
    handleMintTicket,
    handleViewChange,
  } = useTicketManager();

  return (
    <div className={cx("container")}>
      <h1 className={cx("title")}>NFT 티켓 관리</h1>

      {!ticketId && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMintTicket}
          className={cx("mint-button")}
        >
          티켓 발행
        </motion.button>
      )}

      {ticketId && (
        <div className={cx("ticket-container")}>
          <motion.div
            animate={currentView}
            custom={rotationCount}
            variants={cardVariants}
            className={cx("ticket-wrapper")}
          >
            {/* 앞면 - 0도 */}
            <div
              onClick={handleViewChange}
              className={cx("ticket-face", "front")}
            >
              <img
                src={frontImage || ""}
                alt="티켓 앞면"
                className={cx("ticket-image")}
              />
            </div>

            {/* QR 코드 - 120도 */}
            <div onClick={handleViewChange} className={cx("ticket-face", "qr")}>
              {qrCode && <QRCodeCanvas value={qrCode} size={260} />}
            </div>

            {/* 뒷면 - 240도 */}
            <div
              onClick={handleViewChange}
              className={cx("ticket-face", "back")}
            >
              <img
                src={backImage || ""}
                alt="티켓 뒷면"
                className={cx("ticket-image")}
              />
            </div>
          </motion.div>
        </div>
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cx("error-message")}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export default TicketManager;
