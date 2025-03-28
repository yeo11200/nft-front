import { useCallback, useEffect, useState } from "react";
import { useCryptoPrice } from "../../../contexts/CryptoPriceContext";
import dayjs from "dayjs";
import { Transaction } from "../../../hooks";

interface Friend {
  nickname: string;
  address: string;
  emoji?: string;
}

export interface TransactionDetailProps {
  isOpen: boolean;
  transaction: Transaction | null;
  isLoading?: boolean;
  error?: string | null;
  onClose: () => void;
}

// 트랜잭션 타입별 아이콘 매핑
const TX_TYPE_ICONS: { [key: string]: string } = {
  Payment: "💸",
  OfferCreate: "🔄",
  OfferCancel: "❌",
  TrustSet: "🤝",
  EscrowCreate: "⏳",
  EscrowFinish: "✅",
  EscrowCancel: "❎",
  NFTokenMint: "🎨",
  NFTokenBurn: "🔥",
  NFTokenCreateOffer: "📝",
  NFTokenAcceptOffer: "🤝",
  NFTokenCancelOffer: "❌",
  SetRegularKey: "🔑",
  SignerListSet: "📋",
  AccountSet: "⚙️",
  Default: "📄",
};

// 트랜잭션 유형별 제목
const TX_TYPE_TITLES: { [key: string]: string } = {
  Payment: "송금",
  OfferCreate: "거래 제안 생성",
  OfferCancel: "거래 제안 취소",
  TrustSet: "신뢰선 설정",
  EscrowCreate: "에스크로 생성",
  EscrowFinish: "에스크로 완료",
  EscrowCancel: "에스크로 취소",
  NFTokenMint: "NFT 발행",
  NFTokenBurn: "NFT 소각",
  NFTokenCreateOffer: "NFT 제안 생성",
  NFTokenAcceptOffer: "NFT 제안 수락",
  NFTokenCancelOffer: "NFT 제안 취소",
  SetRegularKey: "정규 키 설정",
  SignerListSet: "서명자 목록 설정",
  AccountSet: "계정 설정",
};

export const useTransactionDetail = ({
  isOpen,
  transaction,
  isLoading,
  error,
  onClose,
}: TransactionDetailProps) => {
  const { xrpPriceInfo } = useCryptoPrice();
  const [myWalletAddress, setMyWalletAddress] = useState<string>("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [fromName, setFromName] = useState<string>("");
  const [toName, setToName] = useState<string>("");
  const [fromEmoji, setFromEmoji] = useState<string>("");
  const [toEmoji, setToEmoji] = useState<string>("");
  const [effectiveAmount, setEffectiveAmount] = useState<number>(0);

  // 내 지갑 주소와 친구 목록 가져오기
  useEffect(() => {
    try {
      const userInfo = localStorage.getItem("userInfo");
      if (userInfo) {
        const parsedInfo = JSON.parse(userInfo);
        setMyWalletAddress(parsedInfo.address);
      }

      const friendsData = localStorage.getItem("friends");
      if (friendsData) {
        setFriends(JSON.parse(friendsData));
      }
    } catch (error) {
      console.error("데이터 로딩 오류:", error);
    }
  }, []);

  // 주소로 친구 찾기
  const findFriendByAddress = useCallback(
    (address: string): Friend | null => {
      return friends.find((friend) => friend.address === address) || null;
    },
    [friends]
  );

  // 토큰 정보 포맷팅
  const formatTokenInfo = useCallback((tokenInfo: any): string => {
    if (!tokenInfo) return "";
    if (typeof tokenInfo === "string") {
      const xrpAmount = parseFloat(tokenInfo) / 1000000;
      return `${xrpAmount.toLocaleString("ko-KR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })} XRP`;
    } else if (tokenInfo.currency && tokenInfo.value) {
      return `${parseFloat(tokenInfo.value).toLocaleString("ko-KR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })} ${tokenInfo.currency}`;
    }
    return "";
  }, []);

  // 트랜잭션이 바뀌면 이름 정보 업데이트
  useEffect(() => {
    if (!transaction) return;

    // 발신자 정보
    if (transaction.fromAddress === myWalletAddress) {
      setFromName("나");
      setFromEmoji("");
    } else {
      const fromFriend = findFriendByAddress(transaction.fromAddress);
      if (fromFriend) {
        setFromName(fromFriend.nickname);
        setFromEmoji(fromFriend.emoji || "");
      } else {
        setFromName(formatAddress(transaction.fromAddress));
        setFromEmoji("");
      }
    }

    // 수신자 정보
    if (transaction.toAddress === myWalletAddress) {
      setToName("나");
      setToEmoji("");
    } else if (transaction.toAddress) {
      const toFriend = findFriendByAddress(transaction.toAddress);
      if (toFriend) {
        setToName(toFriend.nickname);
        setToEmoji(toFriend.emoji || "");
      } else {
        setToName(formatAddress(transaction.toAddress));
        setToEmoji("");
      }
    } else {
      setToName("거래소");
      setToEmoji("");
    }

    // 실제 금액 계산
    let amount = 0;

    if (transaction.txType === "Payment") {
      amount = parseFloat(transaction.amount);
      setEffectiveAmount(
        transaction.fromAddress === myWalletAddress
          ? -Math.abs(amount)
          : Math.abs(amount)
      );
    } else if (transaction.txType === "OfferCreate") {
      amount = parseFloat(transaction.fee || "0") / 1000000;
      setEffectiveAmount(-amount);
    } else if (transaction.txType === "TrustSet") {
      setEffectiveAmount(0);
    } else {
      amount = parseFloat(transaction.fee || "0") / 1000000;
      setEffectiveAmount(-amount);
    }
  }, [transaction, myWalletAddress, friends, findFriendByAddress]);

  const formatHash = (hash: string) => {
    if (!hash) return "";
    return hash.length > 16
      ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
      : hash;
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatXrpBalance = (balanceInDrops: string | number): string => {
    const balanceInXrp = parseFloat(balanceInDrops.toString()) / 1000000;
    return balanceInXrp.toLocaleString("ko-KR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return "";

    try {
      return dayjs(timestamp).format("YYYY-MM-DD (HH:mm)");
    } catch (e) {
      return timestamp;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("복사되었습니다!");
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };

  const openInExplorer = (txHash: string) => {
    if (!txHash) return;
    const explorerUrl = `https://testnet.xrpl.org/transactions/${txHash}`;
    window.open(explorerUrl, "_blank");
  };

  // OfferCreate 거래 정보 렌더링
  const renderOfferDetails = (tx: any) => {
    if (tx.txType !== "OfferCreate" || (!tx.takerGets && !tx.takerPays))
      return null;

    return {
      takerGets: formatTokenInfo(tx.takerGets),
      takerPays: formatTokenInfo(tx.takerPays),
    };
  };

  // TrustSet 거래 정보 렌더링
  const renderTrustSetDetails = (tx: any) => {
    if (tx.txType !== "TrustSet" || !tx.limitAmount) return null;

    return {
      currency: tx.limitAmount.currency,
      issuer: tx.limitAmount.issuer,
      value: parseFloat(tx.limitAmount.value).toLocaleString(),
    };
  };

  // 트랜잭션 제목 가져오기
  const getTransactionTitle = (txType: string): string => {
    return TX_TYPE_TITLES[txType] || txType;
  };

  return {
    xrpPriceInfo,
    myWalletAddress,
    fromName,
    toName,
    fromEmoji,
    toEmoji,
    effectiveAmount,
    findFriendByAddress,
    formatTokenInfo,
    formatHash,
    formatAddress,
    formatXrpBalance,
    formatDate,
    copyToClipboard,
    openInExplorer,
    renderOfferDetails,
    renderTrustSetDetails,
    getTransactionTitle,
    TX_TYPE_ICONS,
    transaction,
    isLoading,
    error,
    onClose,
  };
};
