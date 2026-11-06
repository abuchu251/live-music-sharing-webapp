import React from "react";

export interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  isHost?: boolean;
  status?: "online" | "offline" | "buffering";
  className?: string;
}

const colorMap = [
  "from-purple-500 to-indigo-600",
  "from-pink-500 to-rose-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-fuchsia-600",
];

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorMap.length;
  return colorMap[index] ?? "from-purple-500 to-indigo-600";
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] || "?").toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = "md",
  isHost = false,
  status,
  className = "",
}) => {
  const sizeStyles = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const statusDotSizes = {
    sm: "w-2 h-2 ring-1",
    md: "w-2.5 h-2.5 ring-2",
    lg: "w-3 h-3 ring-2",
  };

  const statusColors = {
    online: "bg-emerald-400",
    offline: "bg-zinc-500",
    buffering: "bg-amber-400 animate-pulse",
  };

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${sizeStyles[size]} rounded-full flex items-center justify-center font-semibold text-white overflow-hidden shadow-sm select-none ${
          src ? "bg-zinc-800" : `bg-gradient-to-br ${getGradient(name)}`
        } ${isHost ? "ring-2 ring-amber-400/80" : ""}`}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ${statusDotSizes[size]} ${statusColors[status]} ring-zinc-950`}
        />
      )}
    </div>
  );
};

