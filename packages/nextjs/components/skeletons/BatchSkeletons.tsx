import { Skeleton } from "../ui/skeleton";

export const BatchSekeletons = () => {
  return (
    <div className="flex flex-col gap-1 w-full h-full overflow-auto mt-8">
      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-2 w-full mt-2">
        {[1, 2, 3].map(index => (
          <div
            key={index}
            className="shadow-sm grid grid-cols-[auto_auto_1fr_auto_1fr_auto] gap-3 items-center px-6 py-4 w-full rounded-xl bg-white"
          >
            <Skeleton className="w-4 h-4 rounded-md" />
            <Skeleton className="h-5 w-[105px]" />
            <div className="flex items-center gap-1">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-24 mr-3" />
            <Skeleton className="h-7 w-32 rounded-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-[95px] rounded-lg" />
              <Skeleton className="h-8 w-[95px] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
