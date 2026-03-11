import React from 'react';

const CompanyLogo = ({ size = 32, className = "", iconOnly = false, theme = "dark" }) => {
    // The original logo has a specific aspect ratio. 
    // We'll calculate width based on a standard height of 40 to match the design.
    const fullAspectRatio = 280 / 80; // approximate width/height ratio of full logo
    const iconAspectRatio = 40 / 40; // square aspect ratio for the icon only

    const aspectRatio = iconOnly ? iconAspectRatio : fullAspectRatio;
    const calculatedWidth = size * aspectRatio;

    // Define colors based on the theme
    const textColor = theme === 'light' ? '#1A1A2E' : '#FFFFFF';
    const subTextColor = theme === 'light' ? '#6B7280' : 'rgba(255,255,255,0.65)';

    return (
        <svg
            width={calculatedWidth}
            height={size}
            viewBox={iconOnly ? "0 0 40 40" : "0 0 280 80"}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="blue_oval_gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3b5bf6" />
                    <stop offset="1" stopColor="#1d3ed8" />
                </linearGradient>
                <filter id="oval_shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="-2" dy="-2" stdDeviation="3" floodColor="#fca5a5" floodOpacity="0.5" />
                </filter>
            </defs>

            {/* The 'a' Oval Icon positioned on the left */}
            {/* If iconOnly, we draw it at 0,0 since viewBox is tightly 0 0 40 40 */}
            <g transform={iconOnly ? "translate(0, 0)" : "translate(10, 10)"}>
                <g transform="rotate(20 20 20)">
                    <ellipse cx="20" cy="20" rx="14" ry="18" fill="#FFFFFF" filter="url(#oval_shadow)" />
                </g>
                <text
                    x="18"
                    y="26"
                    fontFamily="'Inter', sans-serif"
                    fontSize="22"
                    fontWeight="800"
                    fill="#1A4731"
                    textAnchor="middle"
                >
                    a
                </text>
            </g>

            {!iconOnly && (
                <>
                    {/* "ACCESS" Text */}
                    <text
                        x="60"
                        y="46"
                        fontFamily="'Inter', sans-serif"
                        fontSize="42"
                        fontWeight="800"
                        fill={textColor}
                        letterSpacing="1.5"
                    >
                        ACCESS
                    </text>

                    {/* "Automation Pvt. Ltd." Subtext */}
                    <text
                        x="20"
                        y="72"
                        fontFamily="'Inter', sans-serif"
                        fontSize="26"
                        fontWeight="500"
                        fill={subTextColor}
                        letterSpacing="0.5"
                    >
                        Automation Pvt. Ltd.
                    </text>
                </>
            )}
        </svg>
    );
};

export default CompanyLogo;
