import React, { useMemo } from "react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { getAvatarTextGradientStyle } from "@/utils/avatarGradient";

type GradientNameProps = {
  seed?: string | null;
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
};

const GradientName: React.FC<GradientNameProps> = ({ seed = "default", className, style, children }) => {
  const gradientStyle = useMemo(() => getAvatarTextGradientStyle(seed ?? "default"), [seed]);

  return (
    <span className={cn("font-semibold", className)} style={{ ...gradientStyle, ...style }}>
      {children}
    </span>
  );
};

export { GradientName };
export default GradientName;
