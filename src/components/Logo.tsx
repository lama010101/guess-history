import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
}

const Logo = ({
  className = ""
}: LogoProps) => {
  return (
    <Link to="/test" className={`flex items-center ${className}`}>
      <img
        src="/icons/logo.webp"
        alt="GUESS-HISTORY logo"
        className="h-56 md:h-80 w-auto"
        loading="eager"
        decoding="async"
      />
    </Link>
  );
};

export default Logo;