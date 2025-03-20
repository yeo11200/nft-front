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
