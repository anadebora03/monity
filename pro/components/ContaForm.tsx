'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

/* Troca de e-mail/senha estando logado — mesmo princípio do app do
   paciente (js/auth.js): supabase.auth.updateUser() não pede
   confirmação nenhuma sozinho, então reautenticamos com a senha
   atual (signInWithPassword) antes de qualquer troca sensível. */
async function reautenticar(senha: string): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return 'Sessão inválida. Faça login novamente.';
  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: senha });
  if (error) return 'Senha atual incorreta.';
  return null;
}

export function ContaForm({ emailInicial }: { emailInicial: string }) {
  const [emailNovo, setEmailNovo] = useState(emailInicial);
  const [senhaParaEmail, setSenhaParaEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [msgEmail, setMsgEmail] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConfirma, setSenhaConfirma] = useState('');
  const [enviandoSenha, setEnviandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  async function salvarEmail() {
    if (!emailNovo.trim() || !senhaParaEmail) {
      setMsgEmail({ tipo: 'erro', texto: 'Preencha o novo e-mail e sua senha atual.' });
      return;
    }
    setEnviandoEmail(true);
    setMsgEmail(null);
    const erroReauth = await reautenticar(senhaParaEmail);
    if (erroReauth) {
      setEnviandoEmail(false);
      setMsgEmail({ tipo: 'erro', texto: erroReauth });
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: emailNovo.trim() });
    setEnviandoEmail(false);
    if (error) {
      setMsgEmail({ tipo: 'erro', texto: 'Não foi possível iniciar a troca. Tente novamente.' });
      return;
    }
    setSenhaParaEmail('');
    setMsgEmail({ tipo: 'ok', texto: 'Confirme a troca pelos links enviados ao e-mail atual e ao novo.' });
  }

  async function salvarSenha() {
    if (!senhaAtual || !senhaNova || !senhaConfirma) {
      setMsgSenha({ tipo: 'erro', texto: 'Preencha a senha atual, a nova senha e a confirmação.' });
      return;
    }
    if (senhaNova.length < 6) {
      setMsgSenha({ tipo: 'erro', texto: 'A nova senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    if (senhaNova !== senhaConfirma) {
      setMsgSenha({ tipo: 'erro', texto: 'As senhas não coincidem.' });
      return;
    }
    setEnviandoSenha(true);
    setMsgSenha(null);
    const erroReauth = await reautenticar(senhaAtual);
    if (erroReauth) {
      setEnviandoSenha(false);
      setMsgSenha({ tipo: 'erro', texto: erroReauth });
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senhaNova });
    setEnviandoSenha(false);
    if (error) {
      setMsgSenha({ tipo: 'erro', texto: 'Não foi possível trocar a senha. Tente novamente.' });
      return;
    }
    setSenhaAtual('');
    setSenhaNova('');
    setSenhaConfirma('');
    setMsgSenha({ tipo: 'ok', texto: 'Senha alterada.' });
  }

  return (
    <div className="mt-3 space-y-4">
      <div className="space-y-3">
        <Input label="E-mail" type="email" value={emailNovo} onChange={(e) => { setEmailNovo(e.target.value); setMsgEmail(null); }} />
        <Input label="Senha atual (pra confirmar a troca)" type="password" autoComplete="current-password" value={senhaParaEmail} onChange={(e) => { setSenhaParaEmail(e.target.value); setMsgEmail(null); }} />
        <div className="flex items-center gap-3">
          <Button size="sm" disabled={enviandoEmail} onClick={salvarEmail}>
            {enviandoEmail ? 'Enviando…' : 'Salvar novo e-mail'}
          </Button>
          {msgEmail && <span className={`text-xs font-medium ${msgEmail.tipo === 'ok' ? 'text-good' : 'text-danger'}`}>{msgEmail.texto}</span>}
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-white/5">
        <Input label="Senha atual" type="password" autoComplete="current-password" value={senhaAtual} onChange={(e) => { setSenhaAtual(e.target.value); setMsgSenha(null); }} />
        <Input label="Nova senha" type="password" autoComplete="new-password" value={senhaNova} onChange={(e) => { setSenhaNova(e.target.value); setMsgSenha(null); }} />
        <Input label="Confirmar nova senha" type="password" autoComplete="new-password" value={senhaConfirma} onChange={(e) => { setSenhaConfirma(e.target.value); setMsgSenha(null); }} />
        <div className="flex items-center gap-3">
          <Button size="sm" disabled={enviandoSenha} onClick={salvarSenha}>
            {enviandoSenha ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
          {msgSenha && <span className={`text-xs font-medium ${msgSenha.tipo === 'ok' ? 'text-good' : 'text-danger'}`}>{msgSenha.texto}</span>}
        </div>
      </div>
    </div>
  );
}
