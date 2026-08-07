import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/config";

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const footerLinks = [
  { label: "Política", href: "/politica" },
  { label: "Privacidade", href: "/privacidade" },
  { label: "Termos", href: "/termos" },
  { label: "Contato", href: "/contato" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-2">
      <Container className="flex flex-col gap-8 py-12 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/brand/logo-mark.png" alt="Monity" width={28} height={28} className="rounded-[8px]" />
            <span className="text-base font-bold text-ink-1">Monity</span>
          </Link>
          <p className="max-w-sm text-sm text-ink-3">
            Acompanhamento inteligente para a sua jornada com GLP-1: aplicações, peso, medidas e exames em um só lugar.
          </p>
          <a
            href={siteConfig.links.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Monity no Instagram"
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-2 transition-colors hover:border-border-strong hover:text-accent"
          >
            <InstagramIcon className="h-4 w-4" />
          </a>
        </div>

        <nav aria-label="Links do rodapé" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-ink-2 transition-colors hover:text-ink-1">
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
      <Container className="border-t border-border py-6">
        <p className="text-xs text-ink-3">
          © {new Date().getFullYear()} {siteConfig.name}. Todos os direitos reservados.
        </p>
      </Container>
    </footer>
  );
}
