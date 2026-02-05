interface QuestSectionProps {
  title: string;
  children: React.ReactNode;
}

export function QuestSection({ title, children }: QuestSectionProps) {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-main-navy-blue rounded-full" />
        <h2 className="font-barlow font-medium text-2xl leading-8 text-grey-1000">{title}</h2>
      </div>

      {/* Section content */}
      {children}
    </div>
  );
}
