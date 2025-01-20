export type StorageValue<T> = T | null;

const localStorageUtil = {
  /**
   * 로컬스토리지에 데이터 저장
   * @param key 저장할 키
   * @param value 저장할 값
   */
  set<T>(key: string, value: T): void {
    try {
      const stringValue = JSON.stringify(value);
      localStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`Error saving to localStorage: ${error}`);
    }
  },

  /**
   * 로컬스토리지에서 데이터 가져오기
   * @param key 가져올 키
   * @returns 저장된 값 또는 null
   */
  get<T>(key: string): StorageValue<T> {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage: ${error}`);
      return null;
    }
  },

  /**
   * 로컬스토리지에서 특정 데이터 삭제
   * @param key 삭제할 키
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage: ${error}`);
    }
  },

  /**
   * 로컬스토리지 초기화
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error(`Error clearing localStorage: ${error}`);
    }
  },

  /**
   * 로컬스토리지에 키가 존재하는지 확인
   * @param key 확인할 키
   * @returns 존재 여부
   */
  has(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error(`Error checking key in localStorage: ${error}`);
      return false;
    }
  },
};

export default localStorageUtil;
