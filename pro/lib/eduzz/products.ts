import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionProduct } from '@/lib/types';

/* Único ponto que traduz um external_product_id da Eduzz pro produto
   Monity — nunca comparar nome de produto no código (item 3 do
   brief). null = produto não mapeado; quem chama decide o que fazer
   (nunca liberar acesso, ver handlers.ts). */
export async function resolveEduzzProduct(supabase: SupabaseClient, externalProductId: string): Promise<SubscriptionProduct | null> {
  const { data } = await supabase
    .from('subscription_products')
    .select('id, provider, external_product_id, product_type, plan_id, patient_product_slug, billing_interval, active')
    .eq('provider', 'eduzz')
    .eq('external_product_id', externalProductId)
    .eq('active', true)
    .maybeSingle();

  return (data as SubscriptionProduct | null) ?? null;
}
