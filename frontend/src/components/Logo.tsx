interface LogoProps {
    size?: number;
    className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 126 126"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path d="M126 67C126 99.5848 99.5848 126 67 126V116C94.062 116 116 94.062 116 67H126ZM106 67C106 88.5391 88.5391 106 67 106V96C83.0163 96 96 83.0163 96 67H106ZM86 67C86 77.4934 77.4934 86 67 86V75C67 70.5817 70.5837 67 75.002 67H86Z" fill="url(#paint0_linear_1_77)" />
            <path d="M0 59H50.9922C55.4104 59 59 55.4183 59 51V0C26.4152 0 0 26.4152 0 59Z" fill="#A855F7" />
            <circle cx="95" cy="31" r="20" fill="#EF93F9" />
            <circle cx="31" cy="95" r="20" fill="#2E58FC" />
            <defs>
                <linearGradient id="paint0_linear_1_77" x1="72" y1="70.5" x2="113.5" y2="106" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2E58FC" />
                    <stop offset="0.521889" stopColor="#A855F7" />
                    <stop offset="1" stopColor="#EF93F9" />
                </linearGradient>
            </defs>
        </svg>
    );
}
