import React from 'react';
import { Link } from 'react-router-dom';
interface LogoProps {
  className?: string;
}
const Logo = ({
  className = ""
}: LogoProps) => {
  return <Link to="/test" className={`flex items-center ${className}`}>
      <h1 className="text-sm md:text-lg font-serif font-bold tracking-tight">
        <span className="text-black dark:text-white">GUESS-</span>
        <span className="text-orange-500">HISTORY</span>
      </h1>
    </Link>;
};
export default Logo;