import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";

export function LegalPlaceholder({ title }: { title: string }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 py-24">
        <Container className="max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink-1">
            <ArrowLeft className="h-4 w-4" />
            Voltar para o início
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-1">{title}</h1>
          <p className="mt-4 text-ink-3">
            Este conteúdo está sendo preparado e será publicado em breve. Se precisar falar com a gente antes
            disso, entre em contato pelo WhatsApp ou Instagram do Compasso.
          </p>
        </Container>
      </main>
      <Footer />
    </>
  );
}
