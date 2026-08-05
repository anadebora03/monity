import { createClient } from '@/lib/supabase/server';
import { getProfessionalInfo } from '@/lib/report-data';
import { listarCompromissos, pacientesSemAtualizacao, proximasAplicacoesHoje, proximosRetornos, getAlertasClinicos, getAgendaStats } from '@/lib/agenda-data';
import { AgendaView } from '@/components/AgendaView';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default async function AgendaPage() {
  const supabase = await createClient();
  const profissional = await getProfessionalInfo(supabase);
  const workspaceId = profissional?.workspaceId || '';

  const hoje = new Date();
  const ini = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-01`;
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const fimStr = `${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())}`;

  const [compromissos, semAtualizacao, aplicacoesHoje, retornos, alertas, stats] = await Promise.all([
    listarCompromissos(supabase, ini, fimStr),
    pacientesSemAtualizacao(supabase),
    proximasAplicacoesHoje(supabase),
    proximosRetornos(supabase),
    getAlertasClinicos(supabase),
    getAgendaStats(supabase),
  ]);

  return (
    <AgendaView
      workspaceId={workspaceId}
      initialCompromissos={compromissos}
      semAtualizacao={semAtualizacao}
      aplicacoesHoje={aplicacoesHoje}
      retornos={retornos}
      alertas={alertas}
      stats={stats}
    />
  );
}
