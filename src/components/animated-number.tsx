import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({
  value,
  duration = 1200,
  formatter = (n: number) => n.toLocaleString("id-ID"),
  className = "",
}: {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animate = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        // ease-out cubic — quick start, gentle settle, matches the rest of
        // this UI's cubic-bezier(0.16, 1, 0.3, 1) easing family.
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(value * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (el.getBoundingClientRect().top < window.innerHeight) {
      animate();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {formatter(display)}
    </span>
  );
}
