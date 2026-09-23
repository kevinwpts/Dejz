
import { useEffect, useState } from "react";
import { useMotionValue, animate } from "motion/react";

export function AnimatedNumber({ value, className, formatter }: { value: number, className?: string, formatter?: (val: number) => string }) {
  const motionValue = useMotionValue(value);
  const [display, setDisplay] = useState(formatter ? formatter(value) : value.toString());

  useEffect(() => {
    const controls = animate(motionValue, value, { 
      duration: 0.5, 
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplay(formatter ? formatter(Math.round(latest)) : Math.round(latest).toString());
      }
    });
    return () => controls.stop();
  }, [value, motionValue, formatter]);

  return <span className={className}>{display}</span>;
}
