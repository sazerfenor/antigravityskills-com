'use client';

import { useEffect, useState } from 'react';
import { Check, Clock, Loader2, Mail } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { SmartIcon } from '@/shared/blocks/common';
import { PaymentModal } from '@/shared/blocks/payment/payment-modal';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useAppContext } from '@/shared/contexts/app';
import { getCookie } from '@/shared/lib/cookie';
import { cn } from '@/shared/lib/utils';
import { Subscription } from '@/shared/models/subscription';
import {
  PricingCurrency,
  PricingItem,
  Pricing as PricingType,
} from '@/shared/types/blocks/pricing';
import { parseApiResponse } from '@/shared/types/api';

// Helper function to get all available currencies from a pricing item
function getCurrenciesFromItem(item: PricingItem | null): PricingCurrency[] {
  if (!item) return [];

  // Always include the default currency first
  const defaultCurrency: PricingCurrency = {
    currency: item.currency,
    amount: item.amount,
    price: item.price || '',
    original_price: item.original_price || '',
  };

  // Add additional currencies if available
  if (item.currencies && item.currencies.length > 0) {
    return [defaultCurrency, ...item.currencies];
  }

  return [defaultCurrency];
}

// Helper function to select initial currency based on locale
function getInitialCurrency(
  currencies: PricingCurrency[],
  locale: string,
  defaultCurrency: string
): string {
  if (currencies.length === 0) return defaultCurrency;

  // If locale is 'zh', prefer CNY
  if (locale === 'zh') {
    const cnyCurrency = currencies.find(
      (c) => c.currency.toLowerCase() === 'cny'
    );
    if (cnyCurrency) {
      return cnyCurrency.currency;
    }
  }

  // Otherwise return default currency
  return defaultCurrency;
}

export function Pricing({
  pricing,
  className,
  currentSubscription,
}: {
  pricing: PricingType;
  className?: string;
  currentSubscription?: Subscription;
}) {
  const locale = useLocale();
  const t = useTranslations('pricing.page');
  const {
    user,
    isShowPaymentModal,
    setIsShowSignModal,
    setIsShowPaymentModal,
    configs,
  } = useAppContext();

  const [group, setGroup] = useState(() => {
    // find current pricing item
    const currentItem = pricing.items?.find(
      (i) => i.product_id === currentSubscription?.productId
    );

    // First look for a group with is_featured set to true
    const featuredGroup = pricing.groups?.find((g) => g.is_featured);
    // If no featured group exists, fall back to the first group
    return (
      currentItem?.group || featuredGroup?.name || pricing.groups?.[0]?.name
    );
  });

  // current pricing item
  const [pricingItem, setPricingItem] = useState<PricingItem | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  // 🆕 Waitlist Modal State
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const [selectedWaitlistItem, setSelectedWaitlistItem] = useState<PricingItem | null>(null);

  // Currency state management for each item
  // Store selected currency and displayed item for each product_id
  const [itemCurrencies, setItemCurrencies] = useState<
    Record<string, { selectedCurrency: string; displayedItem: PricingItem }>
  >({});

  // Initialize currency states for all items
  useEffect(() => {
    if (pricing.items && pricing.items.length > 0) {
      const initialCurrencyStates: Record<
        string,
        { selectedCurrency: string; displayedItem: PricingItem }
      > = {};

      pricing.items.forEach((item) => {
        const currencies = getCurrenciesFromItem(item);
        const selectedCurrency = getInitialCurrency(
          currencies,
          locale,
          item.currency
        );

        // Create displayed item with selected currency
        const currencyData = currencies.find(
          (c) => c.currency.toLowerCase() === selectedCurrency.toLowerCase()
        );

        const displayedItem = currencyData
          ? {
              ...item,
              currency: currencyData.currency,
              amount: currencyData.amount,
              price: currencyData.price,
              original_price: currencyData.original_price,
              // Override with currency-specific payment settings if available
              payment_product_id:
                currencyData.payment_product_id || item.payment_product_id,
              payment_providers:
                currencyData.payment_providers || item.payment_providers,
            }
          : item;

        initialCurrencyStates[item.product_id] = {
          selectedCurrency,
          displayedItem,
        };
      });

      setItemCurrencies(initialCurrencyStates);
    }
  }, [pricing.items, locale]);

  // Handler for currency change
  const handleCurrencyChange = (productId: string, currency: string) => {
    const item = pricing.items?.find((i) => i.product_id === productId);
    if (!item) return;

    const currencies = getCurrenciesFromItem(item);
    const currencyData = currencies.find(
      (c) => c.currency.toLowerCase() === currency.toLowerCase()
    );

    if (currencyData) {
      const displayedItem = {
        ...item,
        currency: currencyData.currency,
        amount: currencyData.amount,
        price: currencyData.price,
        original_price: currencyData.original_price,
        // Override with currency-specific payment settings if available
        payment_product_id:
          currencyData.payment_product_id || item.payment_product_id,
        payment_providers:
          currencyData.payment_providers || item.payment_providers,
      };

      setItemCurrencies((prev) => ({
        ...prev,
        [productId]: {
          selectedCurrency: currency,
          displayedItem,
        },
      }));
    }
  };

  const handlePayment = async (item: PricingItem) => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    // Get the displayed item with correct currency
    const currencyState = itemCurrencies[item.product_id];
    const displayedItem = currencyState?.displayedItem || item;

    // Show payment modal with selected item
    setPricingItem(displayedItem);
    setIsShowPaymentModal(true);
  };

  // 🆕 Handle Waitlist Submission
  const handleWaitlistSubmit = async () => {
    if (!waitlistEmail || !waitlistEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsSubmittingWaitlist(true);
    try {
      // TODO: Connect to backend API to store leads
      console.log('[Waitlist] Email submitted:', waitlistEmail);
      
      toast.success("You're on the list! 🎉", {
        description: "We'll notify you when new spots open.",
        duration: 5000,
      });
      setIsWaitlistOpen(false);
      setWaitlistEmail('');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmittingWaitlist(false);
    }
  };

  const getAffiliateMetadata = ({
    paymentProvider,
  }: {
    paymentProvider: string;
  }) => {
    const affiliateMetadata: Record<string, string> = {};

    // get Affonso referral
    if (
      configs.affonso_enabled === 'true' &&
      ['stripe', 'creem'].includes(paymentProvider)
    ) {
      const affonsoReferral = getCookie('affonso_referral') || '';
      affiliateMetadata.affonso_referral = affonsoReferral;
    }

    // get PromoteKit referral
    if (
      configs.promotekit_enabled === 'true' &&
      ['stripe'].includes(paymentProvider)
    ) {
      const promotekitReferral =
        typeof window !== 'undefined' && (window as any).promotekit_referral
          ? (window as any).promotekit_referral
          : getCookie('promotekit_referral') || '';
      affiliateMetadata.promotekit_referral = promotekitReferral;
    }

    return affiliateMetadata;
  };

  const handleCheckout = async (
    item: PricingItem,
    paymentProvider?: string
  ) => {
    try {
      if (!user) {
        setIsShowSignModal(true);
        return;
      }

      const affiliateMetadata = getAffiliateMetadata({
        paymentProvider: paymentProvider || '',
      });

      const params = {
        product_id: item.product_id,
        currency: item.currency,
        locale: locale || 'en',
        payment_provider: paymentProvider || '',
        metadata: affiliateMetadata,
      };

      setIsLoading(true);
      setProductId(item.product_id);

      const response = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (response.status === 401) {
        setIsLoading(false);
        setProductId(null);
        setPricingItem(null);
        setIsShowSignModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const { code, message, data } = parseApiResponse(await response.json());
      if (code !== 0) {
        throw new Error(message);
      }

      const { checkoutUrl } = data;
      if (!checkoutUrl) {
        throw new Error('checkout url not found');
      }

      window.location.href = checkoutUrl;
    } catch (e: any) {
      console.log('checkout failed: ', e);
      toast.error('checkout failed: ' + e.message);

      setIsLoading(false);
      setProductId(null);
    }
  };

  useEffect(() => {
    if (pricing.items) {
      const featuredItem = pricing.items.find((i) => i.is_featured);
      setProductId(featuredItem?.product_id || pricing.items[0]?.product_id);
      setIsLoading(false);
    }
  }, [pricing.items]);

  // Filter current group items
  const currentItems = pricing.items?.filter(
    (item) => !item.group || item.group === group
  ) || [];

  return (
    <section
      id={pricing.id}
      className={cn(
        'pt-32 pb-12 relative overflow-hidden',
        pricing.className,
        className
      )}
    >
      {/* Cyber Glow Background Effect - Subtle Ceiling Light */}
      <div className="absolute -top-[150px] left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-primary/5 blur-[100px] rounded-[100%] pointer-events-none mix-blend-screen" />

      <div className="relative z-10 mx-auto mb-12 px-4 text-center md:px-8">
        {/* SEO 核心修复: H1 必须可见且唯一 */}
        <h1 className="mb-6 text-3xl font-bold text-pretty lg:text-4xl">
          {pricing.title}
        </h1>
        <p className="text-muted-foreground mx-auto mb-4 max-w-xl lg:max-w-none lg:text-lg">
          {pricing.description}
        </p>
      </div>

      <div className="container relative z-10">
        {pricing.groups && pricing.groups.length > 0 && (
          <div className="mx-auto mt-8 mb-16 flex w-full justify-center md:max-w-lg">
            <Tabs value={group} onValueChange={setGroup} className="">
              <TabsList className="bg-card/30 backdrop-blur-md border border-white/5 p-1">
                {pricing.groups.map((item, i) => {
                  return (
                    <TabsTrigger
                      key={i}
                      value={item.name || ''}
                      className={cn(
                        'group', // Enable child state reactivity
                        'transition-all duration-300',
                        'text-muted-foreground hover:text-foreground',
                        'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_var(--color-primary)]'
                      )}
                    >
                      {item.title}
                      {item.label && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'ml-2 transition-colors',
                            'border-primary/50 text-primary',
                            'group-data-[state=active]:border-black/30 group-data-[state=active]:text-black group-data-[state=active]:bg-black/10'
                          )}
                        >
                          {item.label}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* CBDS Fix: 使用固定的 grid-cols + items-start 防止卡片拉伸 */}
        <div className="mt-0 grid w-full gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start">
          <AnimatePresence mode="popLayout">
            {currentItems.map((item: PricingItem, idx) => {
              let isCurrentPlan = false;
              if (
                currentSubscription &&
                currentSubscription.productId === item.product_id
              ) {
                isCurrentPlan = true;
              }

              // Get currency state for this item
              const currencyState = itemCurrencies[item.product_id];
              const displayedItem = currencyState?.displayedItem || item;
              const selectedCurrency =
                currencyState?.selectedCurrency || item.currency;
              const currencies = getCurrenciesFromItem(item);

              // Determine if this is a featured item
              const isFeatured = item.is_featured;

              return (
                <m.div
                  layout
                  key={item.title + '-' + group}
                  initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                  transition={{
                    duration: 0.3,
                    ease: [0.25, 0.1, 0.25, 1.0], // Mechanical Curve (No Bounce)
                  }}
                  className="h-full"
                >
                  <Card
                    className={cn(
                      'relative h-full flex flex-col transition-all duration-300',
                      'backdrop-blur-xl bg-card/40 border-border-medium',
                      'hover:bg-card/60 hover:border-primary/30',
                      isFeatured && 'border-primary/50 shadow-[0_0_30px_-10px_var(--color-primary)]'
                    )}
                  >
                    {item.label && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <Badge variant="outline" className="bg-black text-primary border-primary shadow-[0_0_10px_var(--color-primary)]">
                          {item.label}
                        </Badge>
                      </div>
                    )}

                    {/* CBDS v2.1: CardHeader - Only Title, Price, Description */}
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-medium text-foreground/90">
                        {item.title}
                      </CardTitle>

                      <div className="my-3 flex items-baseline gap-2">
                        {displayedItem.original_price && (
                          <span className="text-muted-foreground text-sm line-through">
                            {displayedItem.original_price}
                          </span>
                        )}

                        <div className="block text-3xl font-bold">
                          <span className="text-foreground">
                            {displayedItem.price}
                          </span>{' '}
                          {displayedItem.unit ? (
                            <span className="text-muted-foreground text-sm font-normal">
                              {displayedItem.unit}
                            </span>
                          ) : (
                            ''
                          )}
                        </div>

                        {currencies.length > 1 && (
                          <Select
                            value={selectedCurrency}
                            onValueChange={(currency) =>
                              handleCurrencyChange(item.product_id, currency)
                            }
                          >
                            <SelectTrigger
                              size="sm"
                              className="border-muted-foreground/30 bg-background/50 h-6 min-w-[60px] px-2 text-xs"
                            >
                              <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent>
                              {currencies.map((currency) => (
                                <SelectItem
                                  key={currency.currency}
                                  value={currency.currency}
                                  className="text-xs"
                                >
                                  {currency.currency.toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <CardDescription className="text-sm min-h-[40px]">
                        {item.description}
                      </CardDescription>
                      {item.tip && (
                        <span className="text-muted-foreground text-sm">
                          {item.tip}
                        </span>
                      )}
                    </CardHeader>

                    {/* CBDS v2.1: CardContent - Features list, flex-1 to push footer down */}
                    <CardContent className="space-y-4 flex-1">
                      <hr className="border-dashed border-border-medium" />

                      {item.features_title && (
                        <p className="text-sm font-medium">{item.features_title}</p>
                      )}
                      <ul className="list-outside space-y-3 text-sm">
                        {item.features?.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="size-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-muted-foreground/90">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    {/* CBDS v2.1: CardFooter - Action button anchored to bottom */}
                    <CardFooter className="mt-auto pt-6">
                      {isCurrentPlan ? (
                        <Button
                          variant="outline"
                          className="w-full h-11"
                          disabled
                        >
                          <span className="text-sm">
                            {t('current_plan')}
                          </span>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handlePayment(item)}
                          disabled={isLoading}
                          variant={isFeatured ? 'default' : 'outline'}
                          className={cn(
                            'w-full h-11 transition-all',
                            !isFeatured && 'hover:border-primary hover:text-primary hover:shadow-[0_0_15px_var(--color-primary)]'
                          )}
                        >
                          {isLoading && item.product_id === productId ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              <span className="block">{t('processing')}</span>
                            </>
                          ) : (
                            <>
                              {item.button?.icon && (
                                <SmartIcon
                                  name={item.button?.icon as string}
                                  className="size-4"
                                />
                              )}
                              <span className="block">{item.button?.title}</span>
                            </>
                          )}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Unified Refund Notice - Moved from individual cards */}
        <div className="mt-12 text-center text-xs text-muted-foreground max-w-2xl mx-auto">
          <p>
            Prices are in USD. Digital credits are available immediately upon purchase.
            Due to the costs of GPU processing, all sales are final.
            Please read our{' '}
            <a href="/refund-policy" className="text-primary hover:underline">
              Refund Policy
            </a>{' '}
            for details.
          </p>
        </div>
      </div>

      <PaymentModal
        isLoading={isLoading}
        pricingItem={pricingItem}
        onCheckout={(item, paymentProvider) =>
          handleCheckout(item, paymentProvider)
        }
      />

      {/* 🆕 Waitlist Modal - Founder Rate Scarcity Strategy */}
      <Dialog open={isWaitlistOpen} onOpenChange={setIsWaitlistOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border-medium">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary/20 p-2 rounded-full">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="outline" className="text-primary border-primary/50">
                Limited Availability
              </Badge>
            </div>
            <DialogTitle className="text-xl">
              {selectedWaitlistItem?.title || 'Plan'}: Limited Access
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-2">
              To ensure the highest level of generation quality and priority support for our premium members, we release the <strong className="text-foreground">{selectedWaitlistItem?.price || ''} {selectedWaitlistItem?.title || 'Plan'}</strong> spots in strictly limited batches.
              <br /><br />
              The current batch reached capacity. We are opening <strong className="text-primary">new spots</strong> in the next 24 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* CBDS v2.1 Protocol 2: Email Input with explicit height */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                {/* Icon: pointer-events-none to prevent blocking clicks */}
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                {/* Input: Explicit h-12 to match button height */}
                <Input
                  type="email"
                  placeholder="Enter your best email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  className="h-12 pl-10 bg-background/50 border-border-medium focus:border-primary/50 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleWaitlistSubmit()}
                />
              </div>
              <Button 
                onClick={handleWaitlistSubmit} 
                disabled={isSubmittingWaitlist}
                className="h-12 px-6"
              >
                {isSubmittingWaitlist ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Join Waitlist</>
                )}
              </Button>
            </div>

            {/* Manual Concierge Link */}
            <div className="text-center pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Enterprise or urgent access?{' '}
                {/* TODO: 替换为你的联系邮箱 */}
                <a
                  href="mailto:sales@example.com?subject=Enterprise%20Plan%20Request"
                  className="text-primary hover:underline font-medium"
                >
                  Contact Sales for Manual Invoice →
                </a>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
