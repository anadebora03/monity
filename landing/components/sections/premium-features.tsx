"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { premiumFeatures } from "@/lib/content";

export function PremiumFeatures() {
  return (
    <section id="recursos" className="scroll-mt-20 py-24 sm:py-28">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Recursos Premium</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-1 sm:text-4xl">
            Tudo o que a sua rotina precisa, em um só app.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {premiumFeatures.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 6) * 0.05}>
              <motion.div
                whileHover={{ scale: 1.015 }}
                transition={{ duration: 0.2 }}
                className="flex h-full items-start gap-4 rounded-2xl border border-border bg-bg-2 p-5"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
                  <feature.icon className="h-5 w-5 text-accent" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink-1">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-3">{feature.description}</p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
