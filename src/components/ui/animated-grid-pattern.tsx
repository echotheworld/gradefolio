"use client";

import { motion } from "framer-motion";
import React, { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedGridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: string | number;
  numSquares?: number;
  className?: string;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  ...props
}: AnimatedGridPatternProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const getPos = () => {
    return [
      Math.floor((Math.random() * (dimensions.width || 400)) / width),
      Math.floor((Math.random() * (dimensions.height || 400)) / height),
    ];
  };

  const [squares, setSquares] = useState<Array<{ id: number; pos: number[] }>>(() =>
    Array.from({ length: numSquares }, (_, i) => ({
      id: i,
      pos: [0, 0],
    }))
  );

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width: w, height: h } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: w, height: h });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      setSquares(
        Array.from({ length: numSquares }, (_, i) => ({
          id: i,
          pos: getPos(),
        }))
      );
    }
  }, [dimensions, numSquares]);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-blue-400/20 stroke-white/10",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height} V.5 H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [squareX, squareY], id: squareId }) => (
          <motion.rect
            key={`${squareX}-${squareY}-${squareId}`}
            width={width - 1}
            height={height - 1}
            x={squareX * width + 1}
            y={squareY * height + 1}
            fill="currentColor"
            strokeWidth="0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, maxOpacity, 0] }}
            transition={{
              duration,
              repeat: Infinity,
              delay: Math.random() * 2,
              repeatDelay: Math.random() * repeatDelay + 1,
            }}
            onAnimationComplete={() => {
              setSquares((prevSquares) =>
                prevSquares.map((sq) =>
                  sq.id === squareId ? { ...sq, pos: getPos() } : sq
                )
              );
            }}
          />
        ))}
      </svg>
    </svg>
  );
}

export default AnimatedGridPattern;
