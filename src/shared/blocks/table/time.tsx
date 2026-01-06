import { format, formatDistanceToNow, Locale } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useLocale } from 'next-intl';

const localeMap: Record<string, Locale> = {
  en: enUS,
  zh: zhCN,
};

export function Time({
  value,
  placeholder,
  metadata,
  className,
}: {
  value: string | Date;
  placeholder?: string;
  metadata?: Record<string, any>;
  className?: string;
}) {
  if (!value) {
    if (placeholder) {
      return <div className={className}>{placeholder}</div>;
    }

    return null;
  }

  const locale = useLocale();
  const dateFnsLocale = localeMap[locale] || enUS;
  const dateValue = value instanceof Date ? value : new Date(value);

  // 检查日期是否有效
  if (isNaN(dateValue.getTime())) {
    if (placeholder) {
      return <div className={className}>{placeholder}</div>;
    }
    return null;
  }

  return (
    <div className={className}>
      {metadata?.format
        ? format(dateValue, metadata.format, { locale: dateFnsLocale })
        : formatDistanceToNow(dateValue, { addSuffix: true, locale: dateFnsLocale })}
    </div>
  );
}
