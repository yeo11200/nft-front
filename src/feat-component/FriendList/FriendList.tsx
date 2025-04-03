import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./FriendList.module.scss";
import { checkInitialMatches } from "../../utils/initial-search";
import { useXrplAccount } from "../../hooks";
import { useUI } from "../../contexts/UIContext";
import FriendDetailModal, { Friend } from "./components/FriendDetailModal";
import { formatDateToKorean, getLast7Days } from "../../utils/common";

interface DailyTransaction {
  date: string;
  count: number;
}

interface FriendWithStats extends Friend {
  isFavorite: boolean;
  lastTransaction?: string;
  transactionCount: number;
  dailyTransactions?: DailyTransaction[];
}

const FriendList = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [friends, setFriends] = useState<FriendWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<FriendWithStats | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getTransactionHistory } = useXrplAccount();
  const { toast } = useUI();

  // 트랜잭션 통계 로드 함수
  const loadTransactionStats = useCallback(
    async (friendsList: FriendWithStats[]) => {
      setIsLoading(true);
      const userInfo = localStorage.getItem("userInfo");
      if (!userInfo) {
        return;
      }

      const { address } = JSON.parse(userInfo);
      const last7Days = getLast7Days();

      try {
        const result = await getTransactionHistory(address);
        if (result.success) {
          const updatedFriends = friendsList.map((friend) => {
            // 해당 친구와의 거래 필터링
            const transactions = result.transactions.filter(
              (tx) =>
                (tx.fromAddress === address &&
                  tx.toAddress === friend.address) ||
                (tx.fromAddress === friend.address && tx.toAddress === address)
            );

            // 일별 거래 횟수 계산
            const dailyTransactions = last7Days.map((day) => {
              const count = transactions.filter((tx) => {
                // tx.timestamp가 문자열이 아닌 경우 문자열로 변환
                const txDate =
                  typeof tx.timestamp === "string"
                    ? tx.timestamp.split("T")[0]
                    : new Date(tx.timestamp).toISOString().split("T")[0];
                return txDate === day;
              }).length;
              return { date: day, count };
            });

            return {
              ...friend,
              transactionCount: transactions.length,
              lastTransaction:
                transactions.length > 0
                  ? formatDateToKorean(new Date(transactions[0].timestamp))
                  : undefined,
              dailyTransactions,
            };
          });

          setFriends(updatedFriends);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("트랜잭션 내역 로드 오류:", error);
      }
    },
    [getTransactionHistory]
  );

  // 미니 그래프 컴포넌트
  const MiniGraph = ({ data }: { data: DailyTransaction[] }) => {
    // 데이터가 없으면 빈 그래프 렌더링
    if (!data || data.length === 0) {
      return <div className={styles.miniGraph}></div>;
    }

    // 최대값 찾기 (스케일링 용도)
    const maxCount = Math.max(...data.map((d) => d.count), 1);

    return (
      <div className={styles.miniGraph}>
        {data.map((day, index) => (
          <div
            key={day.date}
            className={styles.bar}
            style={{
              height: `${(day.count / maxCount) * 100}%`,
              opacity: day.count > 0 ? 1 : 0.3,
            }}
            title={`${day.date}: ${day.count}회 거래`}
          />
        ))}
      </div>
    );
  };

  // 즐겨찾기 토글 함수
  const toggleFavorite = (address: string) => {
    const updatedFriends = friends.map((friend) =>
      friend.address === address
        ? { ...friend, isFavorite: !friend.isFavorite }
        : friend
    );

    setFriends(updatedFriends);

    // 즐겨찾기 목록 저장
    const favoriteAddresses = updatedFriends
      .filter((f) => f.isFavorite)
      .map((f) => f.address);

    localStorage.setItem("favoriteFriends", JSON.stringify(favoriteAddresses));

    toast(
      `"${friends.find((f) => f.address === address)?.nickname}"님이 ${
        updatedFriends.find((f) => f.address === address)?.isFavorite
          ? "즐겨찾기에 추가되었습니다"
          : "즐겨찾기에서 제거되었습니다"
      }`,
      "info"
    );
  };

  // 친구 상세 정보 모달 열기
  const openFriendDetail = (friend: FriendWithStats) => {
    setSelectedFriend(friend);
    setIsModalOpen(true);
  };

  // 필터링된 친구 목록 (검색어 & 초성 검색)
  const filteredFriends = useMemo(() => {
    if (!searchTerm) return friends;

    return friends.filter((friend) => {
      // 일반 검색 (이름, 주소에 검색어 포함)
      const normalSearch =
        friend.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        friend.address.toLowerCase().includes(searchTerm.toLowerCase());

      // 초성 검색 (한글 자음만 입력한 경우)
      const isInitialSearch = /^[ㄱ-ㅎ]+$/.test(searchTerm);
      const initialSearch =
        isInitialSearch && checkInitialMatches(friend.nickname, searchTerm);

      return normalSearch || initialSearch;
    });
  }, [friends, searchTerm]);

  // 즐겨찾기된 친구 목록
  const favoriteFriends = useMemo(() => {
    return filteredFriends.filter((friend) => friend.isFavorite);
  }, [filteredFriends]);

  // 일반 친구 목록 (즐겨찾기 제외)
  const regularFriends = useMemo(() => {
    return filteredFriends.filter((friend) => !friend.isFavorite);
  }, [filteredFriends]);

  // 친구 목록 및 트랜잭션 내역 로드
  useEffect(() => {
    // 로컬스토리지에서 친구 목록 로드
    const storedFriends = localStorage.getItem("friends");
    const favoriteFriends = localStorage.getItem("favoriteFriends");
    const favorites = favoriteFriends ? JSON.parse(favoriteFriends) : [];

    if (storedFriends) {
      try {
        const parsedFriends = JSON.parse(storedFriends).map(
          (friend: Friend) => ({
            ...friend,
            isFavorite: favorites.includes(friend.address),
            transactionCount: 0,
          })
        );
        setFriends(parsedFriends);

        // 각 친구별 트랜잭션 내역 로드 (통계용)
        loadTransactionStats(parsedFriends);
      } catch (error) {
        console.error("친구 목록 로드 오류:", error);
      }
    }
  }, [loadTransactionStats]);

  return (
    <div className={styles.container}>
      {/* 검색바 */}
      <div className={styles.searchBarContainer}>
        <input
          type="text"
          className={styles.searchBar}
          placeholder="친구 이름 또는 주소 검색 (초성 검색 가능)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            className={styles.clearButton}
            onClick={() => setSearchTerm("")}
          >
            ✕
          </button>
        )}
      </div>

      {/* 검색 결과 카운트 */}
      {searchTerm && (
        <div className={styles.searchResult}>
          검색 결과: {filteredFriends.length}명
        </div>
      )}

      {/* 즐겨찾기 영역 */}
      {favoriteFriends.length > 0 && (
        <motion.div
          className={styles.section}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className={styles.sectionTitle}>
            <span className={styles.emoji}>⭐</span> 즐겨찾기
          </h2>
          <div className={styles.friendsGrid}>
            <AnimatePresence>
              {favoriteFriends.map((friend) => (
                <motion.div
                  key={friend.address}
                  className={styles.friendCard}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openFriendDetail(friend)}
                >
                  <div
                    className={styles.favoriteIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(friend.address);
                    }}
                  >
                    ★
                  </div>
                  <div className={styles.friendEmoji}>{friend.emoji}</div>
                  <div className={styles.friendName}>{friend.nickname}</div>
                  <div className={styles.friendAddress}>
                    {`${friend.address.slice(0, 6)}...${friend.address.slice(
                      -4
                    )}`}
                  </div>
                  {!isLoading && (
                    <div className={styles.friendStats}>
                      {friend.lastTransaction ? (
                        <div className={styles.lastTransaction}>
                          마지막 거래: {friend.lastTransaction}
                        </div>
                      ) : (
                        <div className={styles.lastTransaction}>
                          최근 거래가 없습니다
                        </div>
                      )}
                      {friend.transactionCount > 0 && (
                        <div className={styles.graphContainer}>
                          <div className={styles.graphTitle}>최근 7일 거래</div>
                          <MiniGraph data={friend.dailyTransactions || []} />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* 일반 친구 목록 */}
      <motion.div
        className={styles.section}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h2 className={styles.sectionTitle}>
          <span className={styles.emoji}>👥</span> 친구 목록
        </h2>

        {regularFriends.length > 0 ? (
          <div className={styles.friendsGrid}>
            <AnimatePresence>
              {regularFriends.map((friend) => (
                <motion.div
                  key={friend.address}
                  className={styles.friendCard}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openFriendDetail(friend)}
                >
                  <div
                    className={styles.favoriteIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(friend.address);
                    }}
                  >
                    ☆
                  </div>
                  <div className={styles.friendEmoji}>{friend.emoji}</div>
                  <div className={styles.friendName}>{friend.nickname}</div>
                  <div className={styles.friendAddress}>
                    {`${friend.address.slice(0, 6)}...${friend.address.slice(
                      -4
                    )}`}
                  </div>
                  {!isLoading && (
                    <div className={styles.friendStats}>
                      {friend.lastTransaction ? (
                        <div className={styles.lastTransaction}>
                          마지막 거래: {friend.lastTransaction}
                        </div>
                      ) : (
                        <div className={styles.lastTransaction}>
                          최근 거래가 없습니다
                        </div>
                      )}
                      {friend.transactionCount > 0 && (
                        <div className={styles.graphContainer}>
                          <div className={styles.graphTitle}>최근 7일 거래</div>
                          <MiniGraph data={friend.dailyTransactions || []} />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className={styles.emptyFriends}>
            {searchTerm ? (
              <p>검색 결과가 없습니다</p>
            ) : (
              <>
                <div className={styles.emptyIcon}>🔍</div>
                <p className={styles.emptyText}>아직 등록된 친구가 없어요</p>
                <p className={styles.emptySubtext}>
                  친구를 추가하고 XRP를 주고받아보세요!
                </p>
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* 친구 추가 버튼 (플로팅 버튼) */}
      {/* <motion.button
        className={styles.addFriendButton}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => toast("친구 추가 기능은 곧 제공될 예정입니다.", "info")}
      >
        +
      </motion.button> */}

      {/* 친구 상세 정보 모달 */}
      {isModalOpen && selectedFriend && (
        <FriendDetailModal
          friend={selectedFriend}
          onClose={() => setIsModalOpen(false)}
          onResult={() => loadTransactionStats(friends)}
        />
      )}
    </div>
  );
};

export default FriendList;
