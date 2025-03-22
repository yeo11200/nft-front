/**
 * 암호화폐 시세 관련 서비스
 */

// XRP 시세 정보 타입
export interface XrpPriceInfo {
  currentPrice: number; // 현재 가격 (KRW)
  priceChangePercent: number; // 24시간 가격 변동률 (%)
  lastUpdated: string; // 마지막 업데이트 시간
  high24h: number; // 24시간 최고가
  low24h: number; // 24시간 최저가
}

/**
 * CoinGecko API를 통해 XRP 시세 정보를 가져옵니다.
 * @returns XRP 시세 정보
 */
export const getXrpPrice = async (): Promise<XrpPriceInfo> => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/ripple?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false"
    );

    if (!response.ok) {
      throw new Error("XRP 시세 정보를 가져오는데 실패했습니다.");
    }

    const data = await response.json();

    return {
      currentPrice: data.market_data.current_price.krw,
      priceChangePercent: data.market_data.price_change_percentage_24h,
      lastUpdated: data.market_data.last_updated,
      high24h: data.market_data.high_24h.krw,
      low24h: data.market_data.low_24h.krw,
    };
  } catch (error) {
    console.error("XRP 시세 조회 오류:", error);
    throw error;
  }
};

/**
 * 간단히 XRP의 현재 KRW 가격만 가져옵니다.
 * @returns XRP 현재 가격 (KRW)
 */
export const getSimpleXrpPrice = async (): Promise<number> => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=krw"
    );

    if (!response.ok) {
      throw new Error("XRP 시세 정보를 가져오는데 실패했습니다.");
    }

    const data = await response.json();
    return data.ripple.krw;
  } catch (error) {
    console.error("XRP 시세 조회 오류:", error);
    throw error;
  }
};
