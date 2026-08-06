"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { navItems } from "@/lib/content";
import { externalLinks } from "@/lib/config";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={
        "sticky top-0 z-50 w-full transition-all duration-300 " +
        (scrolled
          ? "border-b border-border bg-[var(--nav-glass)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent")
      }
    >
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image src="/brand/logo-mark.png" alt="Compasso" width={32} height={32} className="rounded-[9px]" priority />
          <span className="text-[17px] font-bold tracking-tight text-ink-1">Compasso</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-accent-soft hover:text-ink-1"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button href={externalLinks.appUrl} variant="ghost" size="md">
            Entrar
          </Button>
          <Button href={externalLinks.checkoutUrl} variant="primary" size="md">
            Começar Agora
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-1"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </Container>

      {open && (
        <div id="mobile-menu" className="border-t border-border bg-bg-2 px-5 pb-6 pt-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Navegação mobile">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-ink-2 hover:bg-accent-soft hover:text-ink-1"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Button href={externalLinks.appUrl} variant="secondary" className="w-full">
              Entrar
            </Button>
            <Button href={externalLinks.checkoutUrl} variant="primary" className="w-full">
              Começar Agora
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
