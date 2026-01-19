"use client";

import React from "react";

const SubmittingStep = () => {
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
    </div>
  );
};

export default SubmittingStep;
