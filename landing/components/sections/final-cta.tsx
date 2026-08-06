import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { externalLinks } from "@/lib/config";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.12] blur-[130px]"
      />
      <Container className="relative flex flex-col items-center gap-8 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-tight text-ink-1 sm:text-4xl lg:text-5xl">
            Comece hoje a acompanhar sua evolução com muito mais clareza.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <Button href={externalLinks.checkoutUrl} size="lg" className="px-10 py-4 text-lg">
            Quero experimentar o Compasso Premium
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
