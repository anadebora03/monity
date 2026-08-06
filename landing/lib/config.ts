export const siteConfig = {
  name: "Compasso",
  tagline: "Sua jornada com GLP-1 merece um acompanhamento inteligente.",
  description:
    "O Compasso organiza aplicações, evolução do peso, exames, medidas corporais e insights em um único lugar, para que você acompanhe cada conquista com clareza.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://compasso.app",
  ogImage: "/og-image.png",
  locale: "pt_BR",
  links: {
    instagram: "https://instagram.com/",
  },
} as const;

/**
 * URLs preenchidas depois: checkout Eduzz (produto ainda não publicado)
 * e o app do Compasso (domínio de produção a confirmar).
 */
export const externalLinks = {
  checkoutUrl: process.env.NEXT_PUBLIC_CHECKOUT_URL ?? "#checkout-em-breve",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "#app-em-breve",
} as const;

export const analyticsConfig = {
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
  gtmId: process.env.NEXT_PUBLIC_GTM_ID ?? "",
} as const;
