import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyEduzzSignature } from '@/lib/eduzz/signature';
import { processEduzzEvent } from '@/lib/eduzz/handlers';

/* Webhook público da Eduzz (Sprint Integração Eduzz). NUNCA usa
   createClient() de lib/supabase/server.ts (baseado em cookie de
   sessão) — a Eduzz não tem sessão nenhuma, é server-to-server.
   Sempre createServiceClient(), único lugar do projeto que usa a
   service role key.

   Formato do payload e nomes de evento vêm de
   developers.eduzz.com/reference/webhook/myeduzz-* (consultado antes
   de implementar, não inventado — ver pro/lib/eduzz/types.ts).

   IMPORTANTE (pro/middleware.ts): /api/* está excluído do matcher do
   middleware de auth — sem isso, este POST seria redirecionado pra
   /login antes de chegar aqui. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature');

  if (!verifyEduzzSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 });
  }

  let payload: { id?: string; event?: string; data?: unknown };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'payload não é JSON válido' }, { status: 400 });
  }

  const { id: externalEventId, event: eventName, data } = payload;
  if (!externalEventId || !eventName) {
    return NextResponse.json({ error: 'payload sem id/event' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Idempotência (item 9 do brief): só 'processed'/'ignored' contam
  // como "já resolvido" — um evento que ficou 'error' numa tentativa
  // anterior é reprocessado na próxima entrega do mesmo external_event_id,
  // nunca tratado como duplicado.
  const { data: existingEvent } = await supabase
    .from('eduzz_webhook_events')
    .select('id, status')
    .eq('external_event_id', externalEventId)
    .maybeSingle();

  if (existingEvent && (existingEvent.status === 'processed' || existingEvent.status === 'ignored')) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (!existingEvent) {
    const { error: insertError } = await supabase
      .from('eduzz_webhook_events')
      .insert({ external_event_id: externalEventId, event_name: eventName, payload, status: 'received' });
    // corrida rara: duas entregas simultâneas do mesmo evento novo — a
    // segunda esbarra na unique constraint. Segue processando mesmo
    // assim (pior caso: processamento duplicado uma vez, já é
    // idempotente por upsert dentro dos handlers).
    if (insertError && insertError.code !== '23505') {
      console.error('[eduzz webhook] falha ao registrar evento', insertError.message);
      return NextResponse.json({ error: 'falha ao registrar evento' }, { status: 500 });
    }
  }

  try {
    const result = await processEduzzEvent(supabase, eventName, data);
    await supabase
      .from('eduzz_webhook_events')
      .update({ status: result.status, processed_at: new Date().toISOString(), error_message: result.note ?? null })
      .eq('external_event_id', externalEventId);

    return NextResponse.json({ ok: true, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    console.error('[eduzz webhook] erro ao processar evento', eventName, message);
    await supabase.from('eduzz_webhook_events').update({ status: 'error', error_message: message.slice(0, 2000) }).eq('external_event_id', externalEventId);

    // 5xx de propósito: sinaliza pra Eduzz tentar de novo (retry dela é
    // o mecanismo de recuperação, não algo que o Monity simula sozinho).
    return NextResponse.json({ error: 'falha ao processar evento' }, { status: 500 });
  }
}
