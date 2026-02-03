"use client";

import React, { useState } from "react";
import Image from "next/image";
import ModalContainer from "~~/components/modals/ModalContainer";
import { Button } from "~~/components/ui/button";
import { useQuestIntroStore } from "~~/services/store/questIntroStore";
import { ModalProps } from "~~/types/modal";

// TODO: Change description text
const STEPS = [
  {
    title: "1. REGISTER YOUR CAMPAIGN ACCOUNT",
    description:
      "Create a Campaign Account and bind your X (Twitter) account + wallet. Note: 1 X account can be connected to multiple wallet addresses. Your Campaign Account is used to calculate your final points and rewards. You may bind your X account and wallets at any time during the campaign, but once bound, they cannot be unbound.",
  },
  {
    title: "2. COMPLETE QUESTS TO EARN POINTS",
    description:
      "Complete various quests to earn points. Points will be calculated and distributed based on your activities. Featured quests are always available, while daily quests refresh every day. The more quests you complete, the more points you earn!",
  },
  {
    title: "3. CLAIM YOUR REWARDS",
    description:
      "At the end of the campaign, claim your rewards based on your total points earned. Rewards will be distributed proportionally based on your ranking on the leaderboard. Stay active and climb the ranks to maximize your rewards!",
  },
];

const QuestIntroModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const markAsSeen = useQuestIntroStore(state => state.markAsSeen);

  const isLastStep = currentStep === STEPS.length - 1;

  const handleClose = () => {
    markAsSeen();
    onClose();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={handleClose} className="w-[720px] p-0" isCloseButton={false}>
      <div className="flex flex-col items-center bg-white rounded-2xl overflow-hidden border border-grey-200 -mx-1.5 -my-4">
        {/* Header */}
        <div className="flex items-center justify-between w-full px-4 py-4 h-[70px]">
          <div className="flex items-center gap-4">
            <Image src="/icons/quest/logo.svg" alt="PolyPay Quest" width={36} height={36} />
            <span className="font-barlow font-semibold text-base leading-[120%] tracking-[-0.03em] uppercase text-grey-1000">
              Welcome to PolyPay Quest
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="w-[38px] h-[38px] flex items-center justify-center bg-white border border-grey-200 rounded-lg hover:bg-grey-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5"
                stroke="#363636"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center px-10 gap-4 w-full">
          {/* Image */}
          <div className="flex justify-center items-center w-full h-[200px]">
            <Image src="/quest/intro.svg" alt="Quest Intro" width={160} height={160} />
          </div>

          {/* Text Content */}
          <div className="flex flex-col items-start gap-4 w-full">
            <h2 className="font-barlow font-medium text-2xl leading-[100%] tracking-[-0.03em] uppercase text-grey-1000 w-full">
              {STEPS[currentStep].title}
            </h2>
            <p className="font-barlow font-normal text-base leading-[155%] tracking-[-0.03em] text-grey-800 w-full">
              {STEPS[currentStep].description}
            </p>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-[3px] py-2">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={
                  index === currentStep ? "w-7 h-2 bg-grey-1000 rounded-[33px]" : "w-2 h-2 bg-grey-200 rounded-full"
                }
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center w-full px-4 py-4 pl-5 gap-[7px] bg-grey-50 border-t border-grey-200 mt-4">
          <Button
            onClick={handleClose}
            className="flex-1 h-9 bg-grey-100 hover:bg-grey-200 text-grey-1000 font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg transition-colors"
          >
            Close
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 h-9 bg-grey-1000 hover:bg-grey-950 text-white font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg transition-colors"
          >
            {isLastStep ? "Let's go" : "Next"}
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
};

export default QuestIntroModal;
