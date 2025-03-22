/**
 * 한글 문자를 초성, 중성, 종성으로 분리하는 함수
 *
 * @param char 분해할 한글 문자
 * @returns 분해된 초성, 중성, 종성 배열 또는 원래 문자
 */
export const disassembleHangul = (char: string): string[] | string => {
  const charCode = char.charCodeAt(0);

  // 한글 유니코드 범위 확인 (AC00-D7A3, 가-힣)
  if (charCode < 0xac00 || charCode > 0xd7a3) {
    return char; // 한글이 아니면 원래 문자 반환
  }

  // 초성, 중성, 종성 테이블
  const CHOSUNG = [
    "ㄱ",
    "ㄲ",
    "ㄴ",
    "ㄷ",
    "ㄸ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅃ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅉ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ];
  const JUNGSUNG = [
    "ㅏ",
    "ㅐ",
    "ㅑ",
    "ㅒ",
    "ㅓ",
    "ㅔ",
    "ㅕ",
    "ㅖ",
    "ㅗ",
    "ㅘ",
    "ㅙ",
    "ㅚ",
    "ㅛ",
    "ㅜ",
    "ㅝ",
    "ㅞ",
    "ㅟ",
    "ㅠ",
    "ㅡ",
    "ㅢ",
    "ㅣ",
  ];
  const JONGSUNG = [
    "",
    "ㄱ",
    "ㄲ",
    "ㄳ",
    "ㄴ",
    "ㄵ",
    "ㄶ",
    "ㄷ",
    "ㄹ",
    "ㄺ",
    "ㄻ",
    "ㄼ",
    "ㄽ",
    "ㄾ",
    "ㄿ",
    "ㅀ",
    "ㅁ",
    "ㅂ",
    "ㅄ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ];

  // 한글 유니코드 계산
  // 한글 = (초성 * 21 + 중성) * 28 + 종성 + 0xAC00
  const uniValue = charCode - 0xac00;
  const jongIndex = uniValue % 28; // 종성 인덱스
  const jungIndex = ((uniValue - jongIndex) / 28) % 21; // 중성 인덱스
  const choIndex = ((uniValue - jongIndex) / 28 - jungIndex) / 21; // 초성 인덱스

  return [CHOSUNG[choIndex], JUNGSUNG[jungIndex], JONGSUNG[jongIndex]];
};

/**
 * 문자열을 초성으로 변환하는 함수
 *
 * @param str 변환할 문자열
 * @returns 초성으로만 구성된 문자열
 */
export const getInitials = (str: string): string => {
  let result = "";

  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    const decomposed = disassembleHangul(char);

    if (Array.isArray(decomposed)) {
      // 한글인 경우 초성만 추가
      result += decomposed[0];
    } else {
      // 한글이 아닌 경우 그대로 추가
      result += char;
    }
  }

  return result;
};

/**
 * 문자열이 주어진 초성 패턴과 일치하는지 확인하는 함수
 *
 * @param str 검사할 문자열
 * @param initials 초성 패턴
 * @returns 일치 여부
 */
export const checkInitialMatches = (str: string, initials: string): boolean => {
  const strInitials = getInitials(str);

  // 초성 패턴의 길이가 원래 문자열의 초성보다 길면 일치할 수 없음
  if (initials.length > strInitials.length) {
    return false;
  }

  // 초성 패턴이 문자열의 초성 시작 부분과 일치하는지 확인
  return strInitials.startsWith(initials);
};
