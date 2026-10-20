import { Check } from "lucide-react";

export function CheckMark({ checked = false, small = false }) {
  return (
    <span
      className={`check-mark${checked ? " is-checked" : ""}${
        small ? " check-mark--small" : ""
      }`}
      aria-hidden="true"
    >
      <Check strokeWidth={2.7} />
    </span>
  );
}
