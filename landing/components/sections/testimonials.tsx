import { Quote } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function Testimonials() {
  return (
    <section className="py-24 sm:py-28">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-1 sm:text-4xl">
            Histórias reais, em breve por aqui.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-dashed border-border bg-bg-2 p-6">
                <Quote className="h-6 w-6 text-accent/50" aria-hidden />
                <p className="mt-4 text-sm leading-relaxed text-ink-3">
                  Em breve você verá aqui histórias reais de pessoas que transformaram sua jornada com o Monity.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-accent-soft" aria-hidden />
                  <div>
                    <p className="h-3 w-24 rounded bg-border" aria-hidden />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
