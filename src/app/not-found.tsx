import Image from 'next/image';
import Link from 'next/link';

import { brandConfig } from '@/config';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Image src={brandConfig.logo.light} alt={brandConfig.name} width={80} height={80} />
      <h1 className="text-2xl font-normal">Page Not Found</h1>
      <p className="text-muted-foreground text-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/" className="mt-4">
          <SmartIcon name="ArrowLeft" />
          <span>Back to {brandConfig.name}</span>
        </Link>
      </Button>
    </div>
  );
}
