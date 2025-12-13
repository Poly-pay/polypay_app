"use client";

import { useInitializeApp } from "~~/hooks";

interface InitializeAppProps {
  children: React.ReactNode;
}

export const InitializeApp: React.FC<InitializeAppProps> = ({ children }) => {
  const { isLoading } = useInitializeApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};
