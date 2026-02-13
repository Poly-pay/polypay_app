"use client";

import React, { useState } from "react";
import Image from "next/image";
import ModalContainer from "~~/components/modals/ModalContainer";
import { Button } from "~~/components/ui/button";
import { useQuestIntroStore } from "~~/services/store/questIntroStore";
import { ModalProps } from "~~/types/modal";

const STEPS = [
  {
    image: "/quest/intro-step-1.png",
    title: "1. START YOUR JOURNEY",
    content: (
      <ul className="list-disc list-inside space-y-2 text-grey-800">
        <li>
          Just <span className="font-semibold text-grey-1000">Connect your Wallet</span>
        </li>
        <li>
          Generate your <span className="font-semibold text-grey-1000">Commitment</span> and you are eligible to
          participate
        </li>
      </ul>
    ),
  },
  {
    image: "/quest/intro-step-2.png",
    title: "2. COMPLETE ON-CHAIN TASKS",
    content: (
      <div className="space-y-3 text-grey-800">
        <p>There are 2 main tasks you can perform:</p>

        {/* Account creation */}
        <div className="space-y-1">
          <p className="flex items-start gap-2">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-grey-800 flex-shrink-0" />
            <span className="font-semibold text-grey-1000">Account creation:</span>
          </p>
          <div className="pl-4 space-y-1">
            <p>
              + User earn <span className="font-semibold text-grey-1000">100 points</span> per Account created
            </p>
            <p>
              + An eligible Account is defined as an Account with{" "}
              <span className="font-semibold text-grey-1000">at least 1 successful transaction</span>.
            </p>
            <p className="text-grey-600 italic">*Note: a transaction does not include adding or removing signers</p>
          </div>
        </div>

        {/* Perform transaction */}
        <div className="space-y-1">
          <p className="flex items-start gap-2">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-grey-800 flex-shrink-0" />
            <span className="font-semibold text-grey-1000">Perform transaction:</span>
          </p>
          <div className="pl-4 space-y-1">
            <p>
              + Each transfer or batch payment transaction earned{" "}
              <span className="font-semibold text-grey-1000">50 points</span> for user
            </p>
            <p>
              + Perform more transaction (except for adding or removing signers) within an Account to unlock Milestone
              Reward
            </p>
            <p>+ Points are credited to the address that initiates the transaction</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    image: "/quest/intro-step-3.png",
    title: "3. RECEIVE REWARDS",
    content: (
      <ul className="list-disc list-inside space-y-2 text-grey-800">
        <li>
          Rewards are distributed <span className="font-semibold text-grey-1000">Weekly</span> once Accumulated
          Milestone thresholds are reached
        </li>
        <li>
          The reward pool will be shared among <span className="font-semibold text-grey-1000">top 100 each week</span>
        </li>
      </ul>
    ),
  },
];

const QuestIntroModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const markAsSeen = useQuestIntroStore(state => state.markAsSeen);

  const isLastStep = currentStep === STEPS.length - 1;
  const step = STEPS[currentStep];

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
          <div className="w-full rounded-2xl overflow-hidden">
            <Image src={step.image} alt={step.title} width={640} height={200} className="w-full h-auto object-cover" />
          </div>

          {/* Text Content */}
          <div className="flex flex-col items-start gap-4 w-full">
            <h2 className="font-barlow font-medium text-2xl leading-[100%] tracking-[-0.03em] uppercase text-grey-1000 w-full">
              {step.title}
            </h2>
            <div className="font-barlow font-normal text-base leading-[155%] tracking-[-0.03em] w-full">
              {step.content}
            </div>
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
            onClick={() => window.open("https://q3labs.gitbook.io/polypay-docs/quest-and-leaderboard", "_blank")}
            className="flex-1 h-9 bg-grey-200 hover:bg-grey-300 text-grey-1000 font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg transition-colors"
          >
            <Image src={"/icons/misc/book.svg"} width={20} height={20} alt="Book" />
            Learn more
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 h-9 bg-grey-1000 hover:bg-grey-950 text-white font-barlow font-medium text-sm leading-5 tracking-[-0.04em] rounded-lg transition-colors"
          >
            {isLastStep ? "Get Started!" : "Next"}
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
};

export default QuestIntroModal;
