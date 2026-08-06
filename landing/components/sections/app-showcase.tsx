"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { PhoneFrame } from "@/components/ui/phone-frame";
import { MockupScreen } from "@/components/ui/mockup-screens";
import { showcaseScreens } from "@/lib/content";
import { cn } from "@/lib/utils";

const AUTO_ROTATE_MS = 3600;

export function AppShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % showcaseScreens.length);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const current = showcaseScreens[active];

  return (
    <section className="relative overflow-hidden py-24 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.08] blur-[130px]"
      />
      <Container className="relative flex flex-col items-center gap-12">
        <Reveal className="max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-1 sm:text-4xl">
            Um app pensado para cada parte da sua jornada.
          </h2>
        </Reveal>

        <div
          className="flex flex-wrap items-center justify-center gap-2"
          role="tablist"
          aria-label="Telas do aplicativo"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {showcaseScreens.map((screen, i) => (
            <button
              key={screen.id}
              role="tab"
              aria-selected={active === i}
              onClick={() => setActive(i)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent",
                active === i
                  ? "bg-accent text-white shadow-[var(--shadow-sm)]"
                  : "text-ink-2 hover:bg-accent-soft hover:text-ink-1"
              )}
            >
              {screen.label}
            </button>
          ))}
        </div>

        <div
          className="relative flex justify-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <PhoneFrame className="max-w-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                className="h-full w-full"
              >
                <MockupScreen variant={current.id} />
              </motion.div>
            </AnimatePresence>
          </PhoneFrame>
        </div>
      </Container>
    </section>
  );
}
