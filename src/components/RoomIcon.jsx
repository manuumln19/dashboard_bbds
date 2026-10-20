import { BedDouble, Home, Music2, Sofa } from "lucide-react";

const ICONS = {
  sofa: Sofa,
  bed: BedDouble,
  music: Music2,
  home: Home,
};

export function RoomIcon({ icon, size = 20, className = "" }) {
  const Icon = ICONS[icon] || Home;
  return (
    <Icon
      size={size}
      strokeWidth={1.8}
      className={className}
      aria-hidden="true"
    />
  );
}
