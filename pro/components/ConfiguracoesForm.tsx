'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { createClient } from '@/lib/supabase/client';
import { atualizarPerfil } from '@/app/pro/configuracoes/actions';

function processAvatarFile(file: File): Promise<Blob> {
  const max = 320;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const w = img.width * sc;
        const h = img.height * sc;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao processar imagem'))), 'image/jpeg', 0.85);
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* Foto de perfil do profissional — mesmo bucket "avatars" e mesma
   convenção de path ({uid}/avatar.jpg) usados pelo avatar do
   paciente (app.js), pra aparecerem os dois no mesmo bucket com a
   mesma regra de RLS (cada um só escreve na própria pasta). */
function AvatarUploader({ fotoUrlInicial }: { fotoUrlInicial: string | null }) {
  const router = useRouter();
  const [fotoUrl, setFotoUrl] = useState(fotoUrlInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    setErro(null);
    try {
      const blob = await processAvatarFile(file);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida.');
      const path = `${user.id}/avatar.jpg`;
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      await supabase.from('professional_profiles').update({ foto_url: url }).eq('id', user.id);
      setFotoUrl(url);
      // Sidebar/header leem foto_url num Server Component à parte
      // (pro/app/pro/layout.tsx) — sem isso, só atualizaria visualmente
      // aqui até a próxima navegação "dura" ou login/logout.
      router.refresh();
    } catch {
      setErro('Não foi possível atualizar sua foto. Tente novamente.');
    } finally {
      setEnviando(false);
      e.target.value = '';
    }
  }

  async function remover() {
    setErro(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: storageError } = await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`]);
    const { error: dbError } = await supabase.from('professional_profiles').update({ foto_url: null }).eq('id', user.id);
    if (storageError || dbError) {
      setErro('Não foi possível remover a foto. Tente novamente.');
      return;
    }
    setFotoUrl(null);
    router.refresh();
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <Avatar nome="" fotoUrl={fotoUrl} size={56} />
        <div className="flex gap-2">
          <label className="cursor-pointer rounded-sm border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-ink transition hover:bg-slate-50 dark:border-border-dark dark:text-white dark:hover:bg-white/5">
            {enviando ? 'Enviando…' : 'Alterar foto'}
            <input type="file" accept="image/*" className="hidden" onChange={onPick} disabled={enviando} />
          </label>
          {fotoUrl && (
            <button type="button" onClick={remover} className="rounded-sm border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-ink-soft transition hover:bg-slate-50 dark:border-border-dark dark:text-white/60 dark:hover:bg-white/5">
              Remover
            </button>
          )}
        </div>
      </div>
      {erro && <p className="mt-2 text-xs font-medium text-danger">{erro}</p>}
    </div>
  );
}

export function ConfiguracoesForm({
  nomeInicial,
  workspaceNomeInicial,
  fotoUrlInicial,
  telefoneInicial,
  crnCrmInicial,
  especialidadeInicial,
  cidadeInicial,
  estadoInicial,
  biografiaInicial,
}: {
  nomeInicial: string;
  workspaceNomeInicial: string;
  fotoUrlInicial: string | null;
  telefoneInicial: string;
  crnCrmInicial: string;
  especialidadeInicial: string;
  cidadeInicial: string;
  estadoInicial: string;
  biografiaInicial: string;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [workspaceNome, setWorkspaceNome] = useState(workspaceNomeInicial);
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [crnCrm, setCrnCrm] = useState(crnCrmInicial);
  const [especialidade, setEspecialidade] = useState(especialidadeInicial);
  const [cidade, setCidade] = useState(cidadeInicial);
  const [estado, setEstado] = useState(estadoInicial);
  const [biografia, setBiografia] = useState(biografiaInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const alterado =
    nome.trim() !== nomeInicial ||
    workspaceNome.trim() !== workspaceNomeInicial ||
    telefone.trim() !== telefoneInicial ||
    crnCrm.trim() !== crnCrmInicial ||
    especialidade.trim() !== especialidadeInicial ||
    cidade.trim() !== cidadeInicial ||
    estado.trim() !== estadoInicial ||
    biografia.trim() !== biografiaInicial;

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    const res = await atualizarPerfil({ nome, workspaceNome, telefone, crnCrm, especialidade, cidade, estado, biografia });
    setSalvando(false);
    if (!res.ok) {
      setErro(res.error);
      return;
    }
    setSalvo(true);
  }

  return (
    <div className="mt-3 space-y-3">
      <AvatarUploader fotoUrlInicial={fotoUrlInicial} />
      <Input label="Nome" value={nome} onChange={(e) => { setNome(e.target.value); setSalvo(false); }} />
      <Input label="Nome do Workspace" value={workspaceNome} onChange={(e) => { setWorkspaceNome(e.target.value); setSalvo(false); }} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Telefone" value={telefone} onChange={(e) => { setTelefone(e.target.value); setSalvo(false); }} placeholder="(00) 00000-0000" />
        <Input label="Registro profissional" value={crnCrm} onChange={(e) => { setCrnCrm(e.target.value); setSalvo(false); }} placeholder="CRN/CRM" />
      </div>
      <Input label="Especialidade" value={especialidade} onChange={(e) => { setEspecialidade(e.target.value); setSalvo(false); }} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Cidade" value={cidade} onChange={(e) => { setCidade(e.target.value); setSalvo(false); }} />
        <Input label="Estado" value={estado} onChange={(e) => { setEstado(e.target.value); setSalvo(false); }} placeholder="UF" maxLength={2} />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium tracking-[-0.005em] text-ink dark:text-white">Biografia</span>
        <textarea
          value={biografia}
          onChange={(e) => { setBiografia(e.target.value); setSalvo(false); }}
          rows={3}
          className="w-full rounded-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition duration-150 ease-out placeholder:text-ink-faint focus:border-accent focus:ring-4 focus:ring-accent/10 dark:border-border-dark dark:bg-navy-soft dark:text-white dark:placeholder:text-white/30 dark:focus:border-accent-light dark:focus:ring-accent-light/10"
        />
      </label>
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
