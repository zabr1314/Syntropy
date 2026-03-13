import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface PanelFrameProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  variant?: 'primary' | 'secondary' | 'glass';
}

const PanelFrame: React.FC<PanelFrameProps> = ({ 
  title, 
  subtitle, 
  action, 
  children, 
  className,
  headerClassName,
  contentClassName,
  variant = 'primary'
}) => {
  const styles = {
    primary: "bg-[#1a0f0f]/80 border-[#d4af37]/30",
    secondary: "bg-[#150c0c]/80 border-[#8d6e63]/30",
    glass: "bg-[#1a0f0f]/40 backdrop-blur-md border-[#d4af37]/20"
  };

  return (
    <div className={clsx(
      "relative flex flex-col overflow-hidden rounded-lg border transition-all duration-300 group",
      styles[variant],
      className
    )}>
      {/* Decorative Corner: Top Left (Cloud/Pattern) */}
      <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none z-10">
        <svg viewBox="0 0 32 32" className="w-full h-full fill-none stroke-[#d4af37]/40 group-hover:stroke-[#d4af37] transition-colors duration-500">
          <path d="M2,10 V2 H10 M2,2 L8,8" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Decorative Corner: Top Right */}
      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none z-10">
        <svg viewBox="0 0 32 32" className="w-full h-full fill-none stroke-[#d4af37]/40 group-hover:stroke-[#d4af37] transition-colors duration-500">
          <path d="M30,10 V2 H22 M30,2 L24,8" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Decorative Corner: Bottom Left */}
      <div className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none z-10">
        <svg viewBox="0 0 32 32" className="w-full h-full fill-none stroke-[#d4af37]/40 group-hover:stroke-[#d4af37] transition-colors duration-500">
          <path d="M2,22 V30 H10 M2,30 L8,24" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Decorative Corner: Bottom Right */}
      <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none z-10">
        <svg viewBox="0 0 32 32" className="w-full h-full fill-none stroke-[#d4af37]/40 group-hover:stroke-[#d4af37] transition-colors duration-500">
          <path d="M30,22 V30 H22 M30,30 L24,24" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Header Area */}
      {(title || subtitle || action) && (
        <div className={clsx(
          "flex items-center justify-between px-4 py-3 border-b border-[#d4af37]/20 shrink-0 bg-gradient-to-r from-transparent via-[#d4af37]/5 to-transparent",
          headerClassName
        )}>
          <div className="flex flex-col leading-none">
            {title && (
              <h3 className="text-lg font-serif font-bold text-[#e6d5ac] tracking-[0.15em] drop-shadow-sm group-hover:text-[#d4af37] transition-colors">
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="text-[9px] font-mono text-[#8d6e63] tracking-widest uppercase mt-1 group-hover:text-[#d4af37]/60 transition-colors">
                {subtitle}
              </span>
            )}
          </div>
          {action && (
            <div className="text-[#d4af37] opacity-80 hover:opacity-100 transition-opacity">
              {action}
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className={clsx(
        "flex-1 min-h-0 overflow-hidden relative z-0",
        contentClassName
      )}>
        {children}
      </div>

      {/* Scanline Effect (Optional, subtle overlay) */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none z-20 mix-blend-overlay opacity-50"></div>
    </div>
  );
};

export default PanelFrame;
