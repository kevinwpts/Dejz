
import { useEffect, useState, useRef } from "react";
import { useMotionValue, animate } from "motion/react";

export function AnimatedNumber({ value, className, formatter }: { value: number, className?: string, formatter?: (val: number) => string }) {
  const motionValue = useMotionValue(value);
  const [display, setDisplay] = useState(() => formatter ? formatter(value) : value.toString());
  const formatterRef = useRef(formatter);
  formatterRef.current = formatter;

  useEffect(() => {
    const controls = animate(motionValue, value, { 
      duration: 0.4, 
      ease: "easeOut",
      onUpdate: (latest) => {
        const rounded = Math.round(latest);
        setDisplay(formatterRef.current ? formatterRef.current(rounded) : rounded.toString());
      }
    });
    return () => controls.stop();
  }, [value, motionValue]);

  return <span className={className}>{display}</span>;
}
