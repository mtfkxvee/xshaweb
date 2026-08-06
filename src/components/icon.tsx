import type { Ref } from "react";

export function Icon({
  name,
  className = "",
  filled = false,
  ref,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  ref?: Ref<HTMLSpanElement>;
}) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`material-symbols-outlined ${filled ? "filled" : ""} ${className}`}
    >
      {name}
    </span>
  );
}
