import React from "react";

interface DejzLogoProps {
  className?: string;
  size?: number | string;
  textColor?: string;
  style?: React.CSSProperties;
}

export function DejzLogo({
  className = "h-7 w-auto",
  style,
}: DejzLogoProps) {
  const hasExplicitHeight = /\b(h-\d+|h-\[|h-auto|h-full)\b/.test(className);

  return (
    <span 
      className={`inline-flex items-center shrink-0 select-none ${
        hasExplicitHeight ? "" : "h-[1.15em]"
      } w-auto ${className}`} 
      style={style}
    >
      {/* Light mode: dejz_mork.png */}
      <img
        src="/dejz_mork.png"
        alt="dejz"
        className="h-full w-auto object-contain block dark:hidden select-none pointer-events-none"
      />
      {/* Dark mode: dejz_ljus.png */}
      <img
        src="/dejz_ljus.png"
        alt="dejz"
        className="h-full w-auto object-contain hidden dark:block select-none pointer-events-none"
      />
    </span>
  );
}

export default DejzLogo;
