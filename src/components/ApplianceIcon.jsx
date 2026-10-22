import { Heater, Plug, WashingMachine } from "lucide-react";

const ICONS = {
  washer: WashingMachine,
  heater: Heater,
};

export const APPLIANCE_SHORT_NAMES = {
  washer: "Lavadora",
  heater: "Termo",
};

export function ApplianceIcon({ id, size = 15, strokeWidth = 1.8 }) {
  const Icon = ICONS[id] || Plug;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}
