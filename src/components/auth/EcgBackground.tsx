import React, { useEffect, useState } from 'react';
import { getPrefersReducedMotion } from '@/styles/loginMotion';

interface EcgBackgroundProps {
  className?: string;
}

export const EcgBackground: React.FC<EcgBackgroundProps> = ({ className = '' }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setPrefersReducedMotion(getPrefersReducedMotion());

    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Standard P-QRS-T complex repeating waveform spanning 1440px with baseline y=130 and peak y=65 (staying below 40% viewport height)
  const ecgPath =
    'M 0 130 ' +
    'L 30 130 Q 42 120 54 130 L 68 130 L 74 135 L 86 65 L 98 160 L 104 130 L 118 130 Q 134 116 150 130 L 200 130 ' +
    'L 230 130 Q 242 120 254 130 L 268 130 L 274 135 L 286 65 L 298 160 L 304 130 L 318 130 Q 334 116 350 130 L 400 130 ' +
    'L 430 130 Q 442 120 454 130 L 468 130 L 474 135 L 486 65 L 498 160 L 504 130 L 518 130 Q 534 116 550 130 L 600 130 ' +
    'L 630 130 Q 642 120 654 130 L 668 130 L 674 135 L 686 65 L 698 160 L 704 130 L 718 130 Q 734 116 750 130 L 800 130 ' +
    'L 830 130 Q 842 120 854 130 L 868 130 L 874 135 L 886 65 L 898 160 L 904 130 L 918 130 Q 934 116 950 130 L 1000 130 ' +
    'L 1030 130 Q 1042 120 1054 130 L 1068 130 L 1074 135 L 1086 65 L 1098 160 L 1104 130 L 1118 130 Q 1134 116 1150 130 L 1200 130 ' +
    'L 1230 130 Q 1242 120 1254 130 L 1268 130 L 1274 135 L 1286 65 L 1298 160 L 1304 130 L 1318 130 Q 1334 116 1350 130 L 1440 130';

  return (
    <div
      aria-hidden="true"
      className={`ecg-background-container ${className}`}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 1440 200"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full text-teal-600 dark:text-teal-400"
      >
        <defs>
          <linearGradient id="ecg-wipe-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="85%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* Central column cutout gradient: masks the waveform across card width + 24px each side */}
          <linearGradient id="ecg-center-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="25%" stopColor="white" stopOpacity="1" />
            <stop offset="27%" stopColor="black" stopOpacity="0" />
            <stop offset="73%" stopColor="black" stopOpacity="0" />
            <stop offset="75%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </linearGradient>

          <mask id="ecg-center-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="200">
            <rect x="0" y="0" width="1440" height="200" fill="url(#ecg-center-gradient)" />
          </mask>

          <mask id="ecg-wipe-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="200">
            {prefersReducedMotion ? (
              <rect x="0" y="0" width="1440" height="200" fill="url(#ecg-center-gradient)" />
            ) : (
              <g
                className="ecg-wipe-slider"
                style={{
                  animationPlayState: isPaused ? 'paused' : 'running',
                }}
              >
                <rect x="-1440" y="0" width="1440" height="200" fill="url(#ecg-center-gradient)" />
                <rect x="0" y="0" width="80" height="200" fill="url(#ecg-wipe-gradient)" />
              </g>
            )}
          </mask>
        </defs>

        {/* The heartbeat line: stroke from accent token at low opacity */}
        <path
          d={ecgPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="opacity-15 dark:opacity-20"
          mask={prefersReducedMotion ? undefined : 'url(#ecg-wipe-mask)'}
        />
      </svg>
    </div>
  );
};

export default EcgBackground;
