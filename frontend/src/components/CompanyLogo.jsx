import React from 'react';

const CompanyLogo = ({ size = 32, className = "" }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <ellipse cx="20" cy="20" rx="16" ry="19" fill="url(#blue_oval_gradient)" />
            <text
                x="20"
                y="27"
                fontFamily="'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                fontSize="24"
                fontWeight="600"
                fill="white"
                textAnchor="middle"
            >
                a
            </text>
            <defs>
                <linearGradient id="blue_oval_gradient" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3b82f6" />
                    <stop offset="1" stopColor="#1d4ed8" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export default CompanyLogo;
