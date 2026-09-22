import { useEffect } from 'react';

let lockCount = 0;
let scrollPosition = 0;

export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    lockCount++;
    
    if (lockCount === 1) {
      scrollPosition = window.pageYOffset;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPosition}px`;
      document.body.style.width = '100%';
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
    }

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overscrollBehavior = '';
        document.documentElement.style.overscrollBehavior = '';
        window.scrollTo(0, scrollPosition);
        lockCount = 0;
      }
    };
  }, [lock]);
}
