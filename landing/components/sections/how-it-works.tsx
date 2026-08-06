"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { howItWorksSteps } from "@/lib/content";

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-20 border-y border-border bg-bg-2 py-24 sm:py-28">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-1 sm:text-4xl">Como funciona</h2>
        </Reveal>

        <div className="relative mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-6 hidden h-px bg-border sm:block"
            style={{ marginInline: "16.67%" }}
          />
          {howItWorksSteps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative flex flex-col items-center text-center"
            >
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-bold text-white shadow-[var(--shadow-md)]">
                {step.number}
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink-1">{step.title}</h3>
              <p className="mt-1.5 max-w-[220px] text-sm leading-relaxed text-ink-3">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
