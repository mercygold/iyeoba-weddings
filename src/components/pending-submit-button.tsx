"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel: ReactNode;
};

export function PendingSubmitButton({
  children,
  className,
  disabled,
  pendingLabel,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      disabled={disabled || pending}
      aria-busy={pending}
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
