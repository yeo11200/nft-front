import { XrpPriceInfo } from "../services/crypto-price.service";

// XRP를 원화로 변환하는 함수 (한국식 단위 표기 추가 + 천 단위 구분)
export const convertXrpToKrw = (
  xrpAmount: number,
  xrpPriceInfo: XrpPriceInfo
): string => {
  if (!xrpPriceInfo || !xrpPriceInfo.currentPrice) {
    return "계산 중...";
  }

  const krwValue = xrpAmount * xrpPriceInfo.currentPrice;

  // 큰 단위 변환 로직
  if (krwValue >= 1000000000000) {
    // 1조 이상
    const trillions = krwValue / 1000000000000;
    return `${trillions.toLocaleString("ko-KR", {
      maximumFractionDigits: 2,
    })}조원`;
  } else if (krwValue >= 100000000) {
    // 1억 이상
    const billions = krwValue / 100000000;
    return `${billions.toLocaleString("ko-KR", {
      maximumFractionDigits: 2,
    })}억원`;
  } else if (krwValue >= 10000) {
    // 1만 이상
    const tenThousands = krwValue / 10000;
    return `${tenThousands.toLocaleString("ko-KR", {
      maximumFractionDigits: 0,
    })}만원`;
  } else {
    // 작은 금액은 일반 통화 형식으로 표시
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(krwValue);
  }
};

// 날짜를 한국어 형식으로 변환하는 함수
export const formatDateToKorean = (date: Date): string => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // 1시간 이내
  if (diffTime < 1000 * 60 * 60) {
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    return `${diffMinutes}분 전`;
  }

  // 오늘 이내
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours < 12 ? "오전" : "오후";
    const hour12 = hours % 12 || 12;

    return `오늘 ${ampm} ${hour12}:${minutes.toString().padStart(2, "0")}`;
  }

  // 어제
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return "어제";
  }

  // 1주일 이내
  if (diffDays < 7) {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${days[date.getDay()]}요일`;
  }

  // 1달 이내
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}주 전`;
  }

  // 1년 이내
  if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)}개월 전`;
  }

  // 1년 이상
  return `${Math.floor(diffDays / 365)}년 전`;
};
