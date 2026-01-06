import { format } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';

/**
 * Format changelog date for display
 * This is a client-safe utility function
 */
export function formatChangelogDate(
  dateStr: string,
  locale: string = 'en'
): string {
  const date = new Date(dateStr);
  const dateFnsLocale = locale === 'zh' ? zhCN : enUS;
  const formatStr = locale === 'zh' ? 'yyyy/MM/dd' : 'MMM d, yyyy';
  return format(date, formatStr, { locale: dateFnsLocale });
}
