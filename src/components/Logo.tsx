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
        className="h-56 md:h-80 w-auto"
        loading="eager"
        decoding="async"
      />
    </div>
  );
};

export default Logo;