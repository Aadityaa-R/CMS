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

  // Standard P-QRS-T complex repeating waveform spanning 1440px
  const ecgPath =
    'M 0 100 ' +
    'L 30 100 Q 42 88 54 100 L 68 100 L 74 106 L 86 36 L 98 142 L 104 100 L 118 100 Q 134 82 150 100 L 200 100 ' +
    'L 230 100 Q 242 88 254 100 L 268 100 L 274 106 L 286 36 L 298 142 L 304 100 L 318 100 Q 334 82 350 100 L 400 100 ' +
    'L 430 100 Q 442 88 454 100 L 468 100 L 474 106 L 486 36 L 498 142 L 504 100 L 518 100 Q 534 82 550 100 L 600 100 ' +
    'L 630 100 Q 642 88 654 100 L 668 100 L 674 106 L 686 36 L 698 142 L 704 100 L 718 100 Q 734 82 750 100 L 800 100 ' +
    'L 830 100 Q 842 88 854 100 L 868 100 L 874 106 L 886 36 L 898 142 L 904 100 L 918 100 Q 934 82 950 100 L 1000 100 ' +
    'L 1030 100 Q 1042 88 1054 100 L 1068 100 L 1074 106 L 1086 36 L 1098 142 L 1104 100 L 1118 100 Q 1134 82 1150 100 L 1200 100 ' +
    'L 1230 100 Q 1242 88 1254 100 L 1268 100 L 1274 106 L 1286 36 L 1298 142 L 1304 100 L 1318 100 Q 1334 82 1350 100 L 1440 100';

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
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

          <mask id="ecg-wipe-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="200">
            {prefersReducedMotion ? (
              <rect x="0" y="0" width="1440" height="200" fill="white" />
            ) : (
              <g
                className="ecg-wipe-slider"
                style={{
                  animationPlayState: isPaused ? 'paused' : 'running',
                }}
              >
                <rect x="-1440" y="0" width="1440" height="200" fill="white" />
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

