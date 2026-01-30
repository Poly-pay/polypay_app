export type LeaderBoardRank = "first" | "second" | "third";

export interface LeaderBoardUser {
  rank: LeaderBoardRank;
  address: string;
  points: number;
}

export const LEADER_BOARD_CONFIG: Record<
  LeaderBoardRank,
  {
    size: number;
    image: string;
    className: string;
    addressClass: string;
    iconSize: number;
    pointsClass: string;
  }
> = {
  first: {
    size: 135,
    image: "/leader-board/first-class.svg",
    className: "avatar-leader-board-first",
    addressClass: "italic text-main-black text-xl",
    iconSize: 32,
    pointsClass: "text-3xl font-medium text-main-black",
  },
  second: {
    size: 120,
    image: "/leader-board/second-class.svg",
    className: "avatar-leader-board-second",
    addressClass: "italic text-main-black",
    iconSize: 22,
    pointsClass: "text-2xl font-medium text-main-black",
  },
  third: {
    size: 120,
    image: "/leader-board/third-class.svg",
    className: "avatar-leader-board-third",
    addressClass: "italic text-main-black",
    iconSize: 22,
    pointsClass: "text-2xl font-medium text-main-black",
  },
};

export const MOCK_LEADER_BOARD_USERS: LeaderBoardUser[] = [
  { rank: "first", address: "4721...8395", points: 58846347 },
  { rank: "second", address: "4721...8395", points: 58846347 },
  { rank: "third", address: "4721...8395", points: 58846347 },
];

export interface LeaderBoardTableItem {
  rank: number;
  commitment: string;
  name: string;
  address: string;
  points: number;
  isCurrentUser?: boolean;
}

export const MOCK_CURRENT_USER: LeaderBoardTableItem = {
  rank: 156,
  commitment: "9999...1111",
  name: "Me",
  address: "0xmy0...addr",
  points: 12345678,
  isCurrentUser: true,
};

export const MOCK_LEADER_BOARD_TABLE: LeaderBoardTableItem[] = [
  { rank: 1, commitment: "1234...5678", name: "Champion", address: "0xabc...1234", points: 120434240 },
  { rank: 2, commitment: "2345...6789", name: "Runner", address: "0xbcd...2345", points: 105234567 },
  { rank: 3, commitment: "3456...7890", name: "Bronze", address: "0xcde...3456", points: 95123456 },
  { rank: 4, commitment: "3893...6457", name: "Apple", address: "0xd23...7srf0", points: 90434240 },
  { rank: 5, commitment: "4721...8395", name: "Banana", address: "0xa12...4def1", points: 85234567 },
  { rank: 6, commitment: "5832...9246", name: "Cherry", address: "0xb34...6ghi2", points: 79123456 },
  { rank: 7, commitment: "6943...0357", name: "Durian", address: "0xc45...8jkl3", points: 72012345 },
  { rank: 8, commitment: "7054...1468", name: "Elder", address: "0xd56...9mno4", points: 65901234 },
  { rank: 9, commitment: "8165...2579", name: "Fig", address: "0xe67...0pqr5", points: 58890123 },
  { rank: 10, commitment: "9276...3680", name: "Grape", address: "0xf78...1stu6", points: 51789012 },
  { rank: 11, commitment: "0387...4791", name: "Honeydew", address: "0xg89...2vwx7", points: 48678901 },
  { rank: 12, commitment: "1498...5802", name: "Jackfruit", address: "0xh90...3yza8", points: 45567890 },
  { rank: 13, commitment: "2509...6913", name: "Kiwi", address: "0xi01...4bcb9", points: 42456789 },
  { rank: 14, commitment: "3610...7024", name: "Lemon", address: "0xj12...5cdc0", points: 39345678 },
  { rank: 15, commitment: "4721...8135", name: "Mango", address: "0xk23...6ded1", points: 36234567 },
  { rank: 16, commitment: "5832...9246", name: "Nectarine", address: "0xl34...7efe2", points: 33123456 },
  { rank: 17, commitment: "6943...0357", name: "Orange", address: "0xm45...8fgf3", points: 30012345 },
  { rank: 18, commitment: "7054...1468", name: "Papaya", address: "0xn56...9ghg4", points: 26901234 },
  { rank: 19, commitment: "8165...2579", name: "Quince", address: "0xo67...0hih5", points: 23890123 },
  { rank: 20, commitment: "9276...3680", name: "Raspberry", address: "0xp78...1iji6", points: 20789012 },
  { rank: 21, commitment: "0387...4791", name: "Strawberry", address: "0xq89...2jkj7", points: 17678901 },
  { rank: 22, commitment: "1498...5802", name: "Tangerine", address: "0xr90...3klk8", points: 14567890 },
  { rank: 23, commitment: "2509...6913", name: "Ugli", address: "0xs01...4lml9", points: 11456789 },
  { rank: 24, commitment: "3610...7024", name: "Vanilla", address: "0xt12...5mnm0", points: 8345678 },
  { rank: 25, commitment: "4721...8135", name: "Watermelon", address: "0xu23...6non1", points: 5234567 },
];
