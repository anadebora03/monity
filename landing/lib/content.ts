import type { LucideIcon } from "lucide-react";
import {
  Syringe,
  Scale,
  Ruler,
  Activity,
  FileText,
  BarChart3,
  Clock,
  ListChecks,
  Sparkles,
  Settings,
  UserCircle,
  Moon,
  RefreshCw,
  History,
} from "lucide-react";

export const navItems = [
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
];

export type TrackCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const trackCards: TrackCard[] = [
  {
    icon: Syringe,
    title: "Aplicações",
    description: "Registre doses e datas em segundos e nunca perca o ritmo do tratamento.",
  },
  {
    icon: Scale,
    title: "Peso",
    description: "Acompanhe a curva de evolução com clareza, sem depender de planilhas soltas.",
  },
  {
    icon: Ruler,
    title: "Medidas",
    description: "Cintura, quadril e outras medidas corporais organizadas em um só histórico.",
  },
  {
    icon: Activity,
    title: "Bioimpedância",
    description: "Massa magra, gordura e água corporal lado a lado com o peso na balança.",
  },
  {
    icon: FileText,
    title: "Exames",
    description: "Guarde e compare resultados laboratoriais ao longo de toda a jornada.",
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    description: "Uma visão consolidada da evolução, pronta para levar à consulta.",
  },
  {
    icon: Clock,
    title: "Linha do tempo",
    description: "Cada aplicação, sintoma e conquista organizados em ordem, sem esforço.",
  },
  {
    icon: ListChecks,
    title: "Plano de ação",
    description: "Próximos passos claros para manter a consistência no tratamento.",
  },
];

export const connectedFlow = [
  "Aplicação",
  "Peso",
  "Sintomas",
  "Insights",
  "Resultados",
];

export type ShowcaseScreen = {
  id: "dashboard" | "peso" | "exames" | "bioimpedancia" | "plano";
  label: string;
};

export const showcaseScreens: ShowcaseScreen[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "peso", label: "Peso" },
  { id: "exames", label: "Exames" },
  { id: "bioimpedancia", label: "Bioimpedância" },
  { id: "plano", label: "Plano de ação" },
];

export type PremiumFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const premiumFeatures: PremiumFeature[] = [
  { icon: Syringe, title: "Registro de aplicações", description: "Doses, datas e locais de aplicação em um fluxo rápido." },
  { icon: History, title: "Histórico completo", description: "Toda a jornada acessível, do primeiro dia até hoje." },
  { icon: Scale, title: "Peso", description: "Curva de evolução clara, sem planilha e sem esforço manual." },
  { icon: Activity, title: "Bioimpedância", description: "Composição corporal detalhada ao lado dos outros dados." },
  { icon: Ruler, title: "Medidas", description: "Acompanhamento de medidas corporais ao longo do tempo." },
  { icon: FileText, title: "Exames", description: "Resultados laboratoriais organizados e comparáveis." },
  { icon: Clock, title: "Linha do tempo", description: "Toda a evolução em ordem cronológica, num só lugar." },
  { icon: ListChecks, title: "Plano de ação", description: "Metas e próximos passos sempre visíveis." },
  { icon: BarChart3, title: "Relatórios", description: "Resumo pronto para compartilhar no acompanhamento." },
  { icon: Sparkles, title: "Insights inteligentes", description: "Padrões e sinais identificados automaticamente." },
  { icon: Settings, title: "Configurações", description: "Personalize o app do jeito que faz sentido pra você." },
  { icon: UserCircle, title: "Perfil", description: "Seus dados e preferências centralizados com segurança." },
  { icon: Moon, title: "Dark mode", description: "Interface confortável a qualquer hora do dia." },
  { icon: RefreshCw, title: "Sincronização", description: "Seus dados acompanham você em qualquer dispositivo." },
];

export type ComparisonRow = {
  feature: string;
  free: boolean | string;
  premium: boolean | string;
};

export const comparisonRows: ComparisonRow[] = [
  { feature: "Registro de aplicações", free: true, premium: true },
  { feature: "Histórico de peso", free: "Últimos 30 dias", premium: "Completo" },
  { feature: "Medidas corporais", free: false, premium: true },
  { feature: "Bioimpedância", free: false, premium: true },
  { feature: "Exames", free: false, premium: true },
  { feature: "Linha do tempo completa", free: false, premium: true },
  { feature: "Plano de ação", free: false, premium: true },
  { feature: "Relatórios exportáveis", free: false, premium: true },
  { feature: "Insights inteligentes", free: false, premium: true },
  { feature: "Sincronização entre dispositivos", free: false, premium: true },
];

export const howItWorksSteps = [
  {
    number: "1",
    title: "Crie sua conta",
    description: "Cadastro rápido, sem burocracia. Comece a usar em menos de um minuto.",
  },
  {
    number: "2",
    title: "Registre sua evolução",
    description: "Aplicações, peso, medidas e exames — tudo em poucos toques.",
  },
  {
    number: "3",
    title: "Acompanhe seus resultados",
    description: "Veja sua jornada organizada, com clareza para cada decisão.",
  },
];

export const faqItems = [
  {
    question: "O Compasso substitui acompanhamento médico?",
    answer:
      "Não. O Compasso é uma ferramenta de organização e acompanhamento da sua jornada — ele não substitui consultas, prescrições ou orientações do seu médico ou nutricionista.",
  },
  {
    question: "Como funciona a assinatura?",
    answer:
      "Você escolhe o plano trimestral ou anual, paga com o método de sua preferência e tem acesso imediato a todos os recursos premium do app.",
  },
  {
    question: "Posso cancelar?",
    answer:
      "Sim, o cancelamento pode ser feito a qualquer momento, direto no app ou pelo suporte, sem burocracia.",
  },
  {
    question: "Meus dados ficam seguros?",
    answer:
      "Sim. Seus dados são armazenados com criptografia e você tem controle total sobre eles, incluindo a opção de exportar ou excluir a qualquer momento.",
  },
  {
    question: "Posso usar no celular?",
    answer:
      "Sim. O Compasso funciona direto do navegador do celular, sem precisar instalar nada de uma loja de aplicativos.",
  },
];
