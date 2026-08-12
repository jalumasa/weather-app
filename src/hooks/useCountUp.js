import { useEffect, useRef, useState } from "react";

/*
  Animates a number toward `target` so temperatures roll into place instead of
  snapping. Returns the in-flight value; callers still do their own rounding.

  Skips the animation entirely on the first real value (so the dashboard doesn't
  count up from 0 on load) and whenever the user prefers reduced motion.
*/
function useCountUp(target, duration = 900) {
  const numericTarget = Number.isFinite(target) ? target : 0;
  const [value, setValue] = useState(numericTarget);
  const previous = useRef(numericTarget);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const from = previous.current;
    previous.current = numericTarget;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // First paint and reduced-motion users get the final value immediately.
    if (!hasAnimated.current || reduceMotion || from === numericTarget) {
      hasAnimated.current = true;
      setValue(numericTarget);
      return undefined;
    }

    let frame = null;
    const start = performance.now();
    // Ease-out cubic: quick off the mark, gentle settle.
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(from + (numericTarget - from) * ease(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [numericTarget, duration]);

  return value;
}

export default useCountUp;
