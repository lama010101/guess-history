import React from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number; // Diameter of the circle
  strokeWidth?: number;
  className?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 60, // Default size
  strokeWidth = 4, // Default stroke width
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`transform -rotate-90 ${className}`} // Rotate to start from top
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className="text-gray-200 dark:text-gray-700" // Background color
        fill="transparent"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-history-primary" // Progress color (using theme color)
        fill="transparent"
        style={{ transition: 'stroke-dashoffset 0.3s ease' }} // Smooth transition
      />
      {/* Percentage text */}
      <text
        x="50%"
        y="50%"
        dy=".3em" // Vertical alignment adjustment
        textAnchor="middle"
        className="transform rotate-90 origin-center fill-current text-sm font-semibold text-foreground" // Rotate text back upright
      >
        {`${Math.round(percentage)}%`}
      </text>
    </svg>
  );
};

export default CircularProgress; 