import { listarConvites } from '@/lib/invites';
import { ConvitesView } from '@/components/ConvitesView';

export default async function ConvitesPage() {
  const convites = await listarConvites();
  return <ConvitesView convites={convites} />;
}
