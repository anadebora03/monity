import { UserX } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPatientDetail } from '@/lib/patient-detail';
import { getProfessionalInfo } from '@/lib/report-data';
import { buscarDadosClinicos } from '@/lib/clinical-intelligence';
import { calcularPrioridadePaciente } from '@/lib/clinical-priority-engine';
import { PatientDetailView } from '@/components/PatientDetailView';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default async function PacienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [paciente, profissional, dadosClinicos, prioridade] = await Promise.all([
    getPatientDetail(supabase, id),
    getProfessionalInfo(supabase),
    buscarDadosClinicos(supabase, id),
    calcularPrioridadePaciente(supabase, id),
  ]);

  if (!paciente.encontrado) {
    return (
      <EmptyState
        icon={UserX}
        title="Paciente não encontrado"
        description="Esse paciente não está mais vinculado a você, ou o link está incorreto."
        action={
          <Link href="/pro/pacientes">
            <Button>Voltar para Pacientes</Button>
          </Link>
        }
      />
    );
  }

  return <PatientDetailView p={paciente} workspaceId={profissional?.workspaceId || ''} dadosClinicos={dadosClinicos} prioridade={prioridade} />;
}
