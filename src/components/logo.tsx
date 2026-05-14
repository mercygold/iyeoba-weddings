"use client";

import Image from "next/image";

type IyeobaLogoProps = {
  priority?: boolean;
  className?: string;
};

export function IyeobaLogo({
  priority = false,
  className = "",
}: IyeobaLogoProps) {
  return (
    <div
      className={`inline-flex items-center ${className}`}
      aria-label="Iyeoba"
    >
      <Image
        src="/iyeoba-logo.png"
        alt="Iyeoba Weddings"
        width={200}
        height={70}
        priority={priority}
        className="h-auto w-auto max-h-[60px] max-w-full object-contain"
      />
    </div>
  );
}
