'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // When pathname changes, navigation completed
    setLoading(false);
    setProgress(100);
    const timeout = setTimeout(() => setProgress(0), 200);
    return () => clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    // Intercept all link clicks to show progress bar immediately
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || anchor.target === '_blank') return;
      
      // Same page link, skip
      if (href === pathname) return;
      
      // Start loading immediately on click
      setLoading(true);
      setProgress(30);
      
      // Animate progress
      const timer1 = setTimeout(() => setProgress(60), 100);
      const timer2 = setTimeout(() => setProgress(80), 300);
      const timer3 = setTimeout(() => setProgress(90), 600);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px]"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="h-full rounded-r-full"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #0d9488, #14b8a6, #5eead4)',
          transition: loading 
            ? 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
            : 'width 0.15s ease-out, opacity 0.3s ease',
          opacity: progress === 100 ? 0 : 1,
          boxShadow: '0 0 10px rgba(20, 184, 166, 0.5)',
        }}
      />
    </div>
  );
}
