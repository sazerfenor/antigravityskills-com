'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

// TODO: 自定义 cookie consent key 为你的品牌
const COOKIE_CONSENT_KEY = 'app_cookie_consent';

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Only run on client after hydration - prevents SSR/CSR mismatch
  useEffect(() => {
    setMounted(true);
    const hasConsented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsented) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setShowBanner(false);
  };

  // Don't render anything during SSR or if banner shouldn't show
  if (!mounted || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4">
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-md sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            We use cookies to improve your experience. By using our site, you agree to our{' '}
            <a
              href="/cookie-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Cookie Policy
            </a>.
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAccept}
              size="sm"
              className="whitespace-nowrap"
            >
              Accept
            </Button>
            <button
              onClick={handleAccept}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
