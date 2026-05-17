"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { useFormStatus } from "react-dom";

type ConfirmSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
  pendingLabel?: string;
};

export function ConfirmSubmitButton({
  confirmMessage,
  className,
  onClick,
  pendingLabel = "Working...",
  disabled,
  children,
  ...props
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (pending) {
      event.preventDefault();
      return;
    }

    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onClick?.(event);
  };

  return (
    <button
      {...props}
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={handleClick}
      className={[
        className,
        "min-h-11 touch-manipulation disabled:cursor-wait disabled:opacity-60",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
