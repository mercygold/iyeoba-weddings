"use client";

import Image from "next/image";
import { useState } from "react";

type IyeobaLogoProps = {
  priority?: boolean;
  className?: string;
};

export function IyeobaLogo({
  priority = false,
  className = "",
}: IyeobaLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`inline-flex items-center ${className}`.trim()} aria-label="Iyeoba">
      {imageFailed ? (
        <span className="font-display text-xl tracking-[0.28em] text-[color:var(--color-brand-primary)] sm:text-2xl">
          IYE OBA
        </span>
      ) : (
        <Image
          src="/iyeoba-logo.png"
          alt="Iyeoba"
          width={220}
          height={72}
          priority={priority}
          onError={() => setImageFailed(true)}
          className="h-auto w-[118px] max-w-full object-contain sm:w-[138px] lg:w-[154px]"
        />
      )}
    </div>
  );
}
