import type { ChangelogEntry } from '@/shared/types/blocks/changelog';
import { ChangelogDetail } from '@/themes/default/blocks/changelog-detail';

export default async function ChangelogDetailPage({
  locale,
  entry,
}: {
  locale?: string;
  entry: ChangelogEntry;
}) {
  return <ChangelogDetail entry={entry} />;
}
