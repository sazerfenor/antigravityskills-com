import { toast } from 'sonner';

/**
 * 💰 Credits Upsell Toast
 *
 * Friendly, non-error toast for prompting users to get more credits.
 * Uses primary yellow styling instead of red error styling.
 *
 * @param message - The message to display
 */
export function showCreditsUpsell(message: string = 'Need more credits to continue.') {
  toast(message, {
    duration: 6000,
    action: {
      label: 'Get Credits',
      onClick: () => window.location.href = '/pricing',
    },
    // Primary yellow styling - friendly upsell, not error
    style: {
      background: 'hsl(48 96% 53% / 0.15)', // primary/15
      border: '1px solid hsl(48 96% 53% / 0.4)', // primary/40
      color: 'hsl(48 96% 53%)', // primary
    },
    // Action button styling
    actionButtonStyle: {
      background: 'hsl(48 96% 53%)', // primary
      color: 'black',
      fontWeight: '600',
    },
  });
}

/**
 * 📢 Info Toast with Action
 *
 * Friendly info toast with optional action button.
 * Uses subtle styling that fits the app theme.
 */
export function showInfoWithAction(
  message: string,
  actionLabel: string,
  actionFn: () => void,
  duration: number = 6000
) {
  toast(message, {
    duration,
    action: {
      label: actionLabel,
      onClick: actionFn,
    },
    style: {
      background: 'hsl(48 96% 53% / 0.1)',
      border: '1px solid hsl(48 96% 53% / 0.3)',
      color: 'hsl(0 0% 98%)',
    },
    actionButtonStyle: {
      background: 'hsl(48 96% 53%)',
      color: 'black',
      fontWeight: '600',
    },
  });
}
