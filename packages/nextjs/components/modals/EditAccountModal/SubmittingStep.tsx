"use client";

import React from "react";

interface SubmittingStepProps {
  loadingState?: string;
  loadingStep?: number;
  totalSteps?: number;
}

const SubmittingStep: React.FC<SubmittingStepProps> = ({ loadingState = "", loadingStep = 0, totalSteps = 4 }) => {
  return (
    <div className="flex flex-col items-center bg-grey-0 rounded-2xl border border-grey-200 w-[420px] py-10">
      {/* Rocket animation video */}
      <div className="w-[200px] h-[200px] flex items-center justify-center">
        <video autoPlay loop muted playsInline className="w-full h-full object-contain">
          <source src="/animations/rocket-loading.mp4" type="video/mp4" />
          {/* Fallback emoji if video fails */}
          <span className="text-6xl">🚀</span>
        </video>
      </div>

      {/* Text container */}
      <div className="flex flex-col items-center px-5 gap-2 w-full">
        {/* Title */}
        <h2 className="text-xl font-semibold tracking-tight uppercase text-grey-1000 text-center w-full">
          <span className="relative">
            Submitting proposal <span className="absolute -right-6 -top-1/3">. . .</span>
          </span>
        </h2>

        {/* Description */}
        <p className="text-sm font-normal tracking-tight text-grey-700 text-center">
          We&apos;re submitting your proposal for approval.
          <br />
          This may take a few moments. Please don&apos;t close this window.
        </p>
      </div>

      {loadingStep > 0 && totalSteps > 0 && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs mt-4">
          <div className="text-sm text-gray-500">
            Step {loadingStep} of {totalSteps} — {loadingState}
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(loadingStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmittingStep;
