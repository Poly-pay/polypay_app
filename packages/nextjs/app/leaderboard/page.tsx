"use client";

import { NextPage } from "next";
import { SectionAvatar } from "~~/components/leader-board";
import { LeaderBoardTable } from "~~/components/leader-board/LeaderBoardTable";

const LeaderBoardPage: NextPage = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <h3 className="text-4xl text-main-black">Leaderboard</h3>
      <div className="p-10 rounded-3xl bg-white border border-grey-100 space-y-10">
        <SectionAvatar />
        <LeaderBoardTable />
      </div>
    </div>
  );
};

export default LeaderBoardPage;
