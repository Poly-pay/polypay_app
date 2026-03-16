interface SpinnerProps {
  className?: string;
}

export function Spinner({ className = "h-4 w-4" }: SpinnerProps) {
  return <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}
