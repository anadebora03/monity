"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowUpRight, Scale, Activity } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { PhoneFrame } from "@/components/ui/phone-frame";
import { MockupScreen } from "@/components/ui/mockup-screens";
import { externalLinks } from "@/lib/config";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-40 h-[420px] w-[420px] rounded-full bg-accent-light/[0.12] blur-[100px]"
      />

      <Container className="relative grid min-h-[88vh] items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="flex flex-col items-start gap-6"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-border bg-bg-2 py-1.5 pl-1.5 pr-4">
            <Image src="/brand/logo-mark.png" alt="" width={26} height={26} className="rounded-[7px]" aria-hidden />
            <span className="text-xs font-semibold tracking-wide text-ink-2">Monity</span>
          </div>

          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-ink-1 sm:text-5xl lg:text-[3.4rem]">
            Sua jornada com GLP-1 merece um acompanhamento inteligente.
          </h1>

          <p className="max-w-lg text-lg leading-relaxed text-ink-2">
            O Monity organiza aplicações, evolução do peso, exames, medidas corporais e insights em um único
            lugar, para que você acompanhe cada conquista com clareza.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href={externalLinks.checkoutUrl} size="lg">
              Acessar Agora
            </Button>
            <Button href="#recursos" variant="secondary" size="lg">
              Conhecer Recursos
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative mx-auto flex justify-center lg:justify-end"
        >
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <PhoneFrame className="max-w-[320px] shadow-[var(--shadow-lg)]">
              <MockupScreen variant="dashboard" />
            </PhoneFrame>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              className="absolute -left-16 top-16 hidden w-40 rounded-2xl border border-border bg-elevated/90 p-3.5 shadow-[var(--shadow-md)] backdrop-blur-sm sm:block"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft">
                  <Scale className="h-3.5 w-3.5 text-accent" />
                </span>
                <span className="text-[11px] font-medium text-ink-2">Peso</span>
              </div>
              <p className="mt-2 text-lg font-bold text-ink-1">-5,2 kg</p>
              <p className="text-[10px] text-good">em 8 semanas</p>
            </motion.div>

            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute -right-10 bottom-24 hidden w-44 rounded-2xl border border-border bg-elevated/90 p-3.5 shadow-[var(--shadow-md)] backdrop-blur-sm sm:block"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft">
                  <Activity className="h-3.5 w-3.5 text-accent" />
                </span>
                <span className="text-[11px] font-medium text-ink-2">Bioimpedância</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-good">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <p className="text-lg font-bold text-ink-1">24,1%</p>
              </div>
              <p className="text-[10px] text-ink-3">gordura corporal</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
