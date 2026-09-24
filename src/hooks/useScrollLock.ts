import { useEffect } from 'react';

let lockCount = 0;

export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    lockCount++;
    
    if (lockCount === 1) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        lockCount = 0;
      }
    };
  }, [lock]);
}
