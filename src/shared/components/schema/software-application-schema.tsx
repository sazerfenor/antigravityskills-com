import Script from 'next/script';

interface SoftwareApplicationSchemaProps {
  name: string;
  description: string;
  features?: string[];
  price?: string;
  priceCurrency?: string;
}

/**
 * SoftwareApplication Schema Component
 * 
 * Renders JSON-LD structured data for SoftwareApplication type.
 * Helps search engines understand the application and display rich results.
 * 
 * @see https://schema.org/SoftwareApplication
 */
export function SoftwareApplicationSchema({
  name,
  description,
  features = [],
  price = '0',
  priceCurrency = 'USD',
}: SoftwareApplicationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    operatingSystem: 'Web-based',
    applicationCategory: 'MultimediaApplication',
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency,
      availability: 'https://schema.org/InStock',
    },
    description,
    ...(features.length > 0 && { featureList: features }),
  };

  return (
    <Script
      id="software-application-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
