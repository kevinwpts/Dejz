import React from "react";

interface DejzLogoProps {
  className?: string;
  size?: number | string;
  textColor?: string;
  style?: React.CSSProperties;
}

export function DejzLogo({
  className = "h-7 w-auto",
  textColor,
  style,
}: DejzLogoProps) {
  const hasExplicitHeight = /\b(h-\d+|h-\[|h-auto|h-full)\b/.test(className);

  return (
    <span 
      className={`relative inline-flex items-center shrink-0 select-none ${
        hasExplicitHeight ? "" : "h-[1.15em]"
      } w-auto ${className}`} 
      style={style}
    >
      {/* Invisible sizing reference image so exact aspect ratio and width are preserved */}
      <img
        src="/dejz_mork.png"
        alt="dejz"
        className="h-full w-auto object-contain opacity-0 select-none pointer-events-none block"
      />
      {/* Masked color layer that renders the logo in the active primary brand color */}
      <span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-colors duration-200"
        style={{
          backgroundColor: textColor || "var(--logo-color, var(--accent-color))",
          WebkitMaskImage: "url('/dejz_mork.png')",
          maskImage: "url('/dejz_mork.png')",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    </span>
  );
}

export default DejzLogo;
