'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* Grade pura (sem lib de datas) — 6 linhas fixas de 7 dias, incluindo
   os dias do mês anterior/seguinte que completam a semana, pra grade
   nunca "pular" de tamanho entre meses. */
function buildMonthGrid(ano: number, mes: number) {
  const primeiro = new Date(ano, mes, 1);
  const inicioGrade = new Date(ano, mes, 1 - primeiro.getDay());
  const semanas: Date[][] = [];
  const cursor = new Date(inicioGrade);
  for (let semana = 0; semana < 6; semana++) {
    const dias: Date[] = [];
    for (let dia = 0; dia < 7; dia++) {
      dias.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(dias);
  }
  return semanas;
}

export function CalendarMonth({
  ano,
  mes,
  selecionado,
  diasComEventos,
  onSelecionar,
  onMesChange,
}: {
  ano: number;
  mes: number;
  selecionado: string;
  diasComEventos: Set<string>;
  onSelecionar: (iso: string) => void;
  onMesChange: (ano: number, mes: number) => void;
}) {
  const hojeISO = toISO(new Date());
  const semanas = buildMonthGrid(ano, mes);

  function irMesAnterior() {
    const d = new Date(ano, mes - 1, 1);
    onMesChange(d.getFullYear(), d.getMonth());
  }
  function irProximoMes() {
    const d = new Date(ano, mes + 1, 1);
    onMesChange(d.getFullYear(), d.getMonth());
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-ink dark:text-white">
          {MESES[mes]} {ano}
        </p>
        <div className="flex gap-1">
          <button onClick={irMesAnterior} aria-label="Mês anterior" className="flex h-7 w-7 items-center justify-center rounded-sm text-ink-soft hover:bg-slate-50 dark:text-white/60 dark:hover:bg-white/5">
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <button onClick={irProximoMes} aria-label="Próximo mês" className="flex h-7 w-7 items-center justify-center rounded-sm text-ink-soft hover:bg-slate-50 dark:text-white/60 dark:hover:bg-white/5">
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i} className="py-1 text-[11px] font-semibold uppercase text-ink-faint dark:text-white/40">
            {d}
          </span>
        ))}
        {semanas.flat().map((d, i) => {
          const iso = toISO(d);
          const noMes = d.getMonth() === mes;
          const isHoje = iso === hojeISO;
          const isSelecionado = iso === selecionado;
          const temEvento = diasComEventos.has(iso);
          return (
            <button
              key={i}
              onClick={() => onSelecionar(iso)}
              className={`relative flex h-9 w-full flex-col items-center justify-center rounded-sm text-[13px] transition-colors duration-150 ${
                !noMes ? 'text-ink-faint/50 dark:text-white/20' : isSelecionado ? 'bg-accent-gradient font-semibold text-white' : isHoje ? 'font-semibold text-accent dark:text-accent-light' : 'text-ink hover:bg-slate-50 dark:text-white dark:hover:bg-white/5'
              }`}
            >
              {d.getDate()}
              {temEvento && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelecionado ? 'bg-white' : 'bg-accent dark:bg-accent-light'}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { toISO };
