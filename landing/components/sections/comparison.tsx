import { Check, Minus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { comparisonRows } from "@/lib/content";
import { externalLinks } from "@/lib/config";

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm text-ink-2">{value}</span>;
  }
  return value ? (
    <Check className="mx-auto h-4 w-4 text-good" aria-label="Incluído" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-ink-3" aria-label="Não incluído" />
  );
}

export function Comparison() {
  return (
    <section id="planos" className="scroll-mt-20 py-24 sm:py-28">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-1 sm:text-4xl">Gratuito ou Premium.</h2>
          <p className="mt-3 text-ink-3">Comece de graça. Evolua quando fizer sentido pra sua rotina.</p>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="bg-bg-2">
                  <th scope="col" className="p-5 text-sm font-semibold text-ink-1">
                    Recurso
                  </th>
                  <th scope="col" className="p-5 text-center text-sm font-semibold text-ink-2">
                    Gratuito
                  </th>
                  <th scope="col" className="p-5 text-center text-sm font-semibold text-accent">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-bg" : "bg-bg-2"}>
                    <td className="p-5 text-sm text-ink-2">{row.feature}</td>
                    <td className="p-5 text-center">
                      <Cell value={row.free} />
                    </td>
                    <td className="p-5 text-center">
                      <Cell value={row.premium} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center gap-3 border-t border-border bg-bg-2 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-ink-2">
              Plano trimestral <span className="font-semibold text-ink-1">R$ 69,90</span> · Plano anual{" "}
              <span className="font-semibold text-ink-1">R$ 193,50</span>
            </p>
            <Button href={externalLinks.checkoutUrl} size="md">
              Quero o Premium
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
