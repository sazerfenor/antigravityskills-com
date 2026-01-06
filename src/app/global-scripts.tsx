import { Suspense } from 'react';

import { getAdsService } from '@/shared/services/ads';
import { getAffiliateService } from '@/shared/services/affiliate';
import { getAnalyticsService } from '@/shared/services/analytics';
import { getCustomerService } from '@/shared/services/customer_service';

/**
 * GlobalScriptsLoader - Server Component that fetches service data
 * This component is wrapped in Suspense to avoid blocking TTFB
 */
async function GlobalScriptsLoader() {
  // Parallel initialization of all services
  const [adsService, analyticsService, affiliateService, customerService] = await Promise.all([
    getAdsService(),
    getAnalyticsService(),
    getAffiliateService(),
    getCustomerService(),
  ]);

  // Get all script components
  const adsBodyScripts = adsService.getBodyScripts();
  const analyticsBodyScripts = analyticsService.getBodyScripts();
  const affiliateBodyScripts = affiliateService.getBodyScripts();
  const customerServiceBodyScripts = customerService.getBodyScripts();

  return (
    <>
      {/* inject ads body scripts */}
      {adsBodyScripts}

      {/* inject analytics body scripts */}
      {analyticsBodyScripts}

      {/* inject affiliate body scripts */}
      {affiliateBodyScripts}

      {/* inject customer service body scripts */}
      {customerServiceBodyScripts}
    </>
  );
}

/**
 * GlobalHeadScriptsLoader - Server Component for head scripts
 * These are critical for analytics, wrapped in Suspense
 */
async function GlobalHeadScriptsLoader() {
  const [adsService, analyticsService, affiliateService, customerService] = await Promise.all([
    getAdsService(),
    getAnalyticsService(),
    getAffiliateService(),
    getCustomerService(),
  ]);

  return (
    <>
      {/* inject ads meta tags & head scripts */}
      {adsService.getMetaTags()}
      {adsService.getHeadScripts()}

      {/* inject analytics meta tags & head scripts */}
      {analyticsService.getMetaTags()}
      {analyticsService.getHeadScripts()}

      {/* inject affiliate meta tags & head scripts */}
      {affiliateService.getMetaTags()}
      {affiliateService.getHeadScripts()}

      {/* inject customer service meta tags & head scripts */}
      {customerService.getMetaTags()}
      {customerService.getHeadScripts()}
    </>
  );
}

/**
 * GlobalScripts - Wrapper with Suspense for body scripts
 * Falls back to nothing (scripts load after initial render)
 */
export function GlobalScripts() {
  return (
    <Suspense fallback={null}>
      <GlobalScriptsLoader />
    </Suspense>
  );
}

/**
 * GlobalHeadScripts - Wrapper with Suspense for head scripts
 * Falls back to nothing
 */
export function GlobalHeadScripts() {
  return (
    <Suspense fallback={null}>
      <GlobalHeadScriptsLoader />
    </Suspense>
  );
}
