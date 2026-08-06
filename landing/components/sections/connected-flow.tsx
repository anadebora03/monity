"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { connectedFlow } from "@/lib/content";

export function ConnectedFlow() {
  return (
    <section className="border-y border-border bg-bg-2 py-24 sm:py-28">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-1 sm:text-4xl">Tudo conectado.</h2>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ staggerChildren: 0.12 }}
          className="mt-16 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-0"
        >
          {connectedFlow.map((step, i) => (
            <motion.div
              key={step}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex items-center gap-3 sm:gap-0"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 min-w-[8.5rem] items-center justify-center rounded-full border border-border-strong bg-bg px-5 text-sm font-semibold text-ink-1 shadow-[var(--shadow-sm)]">
                  {step}
                </div>
              </div>
              {i < connectedFlow.length - 1 && (
                <div className="flex h-12 items-center px-2 text-accent sm:px-4" aria-hidden>
                  <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
