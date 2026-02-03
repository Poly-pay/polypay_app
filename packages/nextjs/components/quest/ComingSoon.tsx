import Image from "next/image";

export function ComingSoon() {
  return (
    <div className="w-full h-[269px] flex items-center justify-center">
      <Image
        src="/quest/coming-soon.svg"
        alt="Coming Soon"
        width={120}
        height={180}
      />
    </div>
  );
}
