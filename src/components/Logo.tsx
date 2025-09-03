import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo = ({
  className = ""
}: LogoProps) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/icons/logo.webp"
        alt="GUESS-HISTORY logo"
        className="h-40 md:h-40 w-auto"
        loading="eager"
        decoding="async"
      />
    </div>
  );
};

export default Logo;