import Link from 'next/link';

import { brandConfig } from '@/config';
import { Button } from '@/shared/components/ui/button';

/**
 * Built With Badge - 显示品牌标识的徽章组件
 * TODO: 自定义 emoji 和链接
 */
export function BuiltWith() {
  return (
    <Button asChild variant="outline" size="sm" className="hover:bg-primary/10">
      <Link href={brandConfig.domain} target="_blank">
        🎨 {brandConfig.name}
      </Link>
    </Button>
  );
}
