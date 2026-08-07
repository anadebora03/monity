'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { atualizarPerfil } from '@/app/pro/configuracoes/actions';

export function ConfiguracoesForm({ nomeInicial, workspaceNomeInicial }: { nomeInicial: string; workspaceNomeInicial: string }) {
  const [nome, setNome] = useState(nomeInicial);
  const [workspaceNome, setWorkspaceNome] = useState(workspaceNomeInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const alterado = nome.trim() !== nomeInicial || workspaceNome.trim() !== workspaceNomeInicial;

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    const res = await atualizarPerfil(nome, workspaceNome);
    setSalvando(false);
    if (!res.ok) {
      setErro(res.error);
      return;
    }
    setSalvo(true);
  }

  return (
    <div className="mt-3 space-y-3">
      <Input label="Nome" value={nome} onChange={(e) => { setNome(e.target.value); setSalvo(false); }} />
      <Input label="Nome do Workspace" value={workspaceNome} onChange={(e) => { setWorkspaceNome(e.target.value); setSalvo(false); }} />
      <div className="flex items-center gap-3 pt-1">
        <Button size="sm" disabled={!alterado || salvando} onClick={salvar}>
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </Button>
        {salvo && <span className="text-xs font-medium text-good">Salvo.</span>}
        {erro && <span className="text-xs font-medium text-danger">{erro}</span>}
      </div>
    </div>
  );
}
