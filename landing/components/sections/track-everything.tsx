"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { trackCards } from "@/lib/content";

export function TrackEverything() {
  return (
    <section className="py-24 sm:py-28">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-1 sm:text-4xl">
            Você não precisa mais acompanhar tudo em vários lugares.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trackCards.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.06}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                className="h-full rounded-2xl border border-border bg-bg-2 p-6 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
                  <card.icon className="h-5 w-5 text-accent" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink-1">{card.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{card.description}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
