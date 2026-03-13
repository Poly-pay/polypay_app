import { useEffect, useState } from "react";

export interface StepDefinition {
  id: number;
  label: string;
}

export function useStepLoading(steps: StepDefinition[]) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);

  const totalSteps = steps.length;

  const startStep = (id: number) => {
    const found = steps.find(s => s.id === id);
    if (found) {
      setIsLoading(true);
      setLoadingStep(found.id);
      setLoadingState(found.label);
    }
  };

  const setStepByLabel = (label: string) => {
    const found = steps.find(s => s.label === label);
    if (found) {
      setLoadingStep(found.id);
      setLoadingState(found.label);
    } else {
      setLoadingState(label);
    }
  };

  const reset = () => {
    setIsLoading(false);
    setLoadingStep(0);
    setLoadingState("");
  };

  // Prevent accidental refresh while loading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isLoading) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isLoading]);

  return {
    isLoading,
    loadingState,
    loadingStep,
    totalSteps,
    startStep,
    setStepByLabel,
    reset,
  };
}

