import type { ChangelogList } from '@/shared/types/blocks/changelog';
import { Changelog } from '@/themes/default/blocks/changelog';

export default async function ChangelogPage({
  locale,
  changelog,
}: {
  locale?: string;
  changelog: ChangelogList;
}) {
  return <Changelog changelog={changelog} />;
}
