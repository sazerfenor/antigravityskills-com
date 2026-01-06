'use client';

import { ChevronDown } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

interface FAQItem {
  question: string;
  answer: string;
}

interface SEOContentDisplayProps {
  contentIntro?: string | null;
  promptBreakdown?: string | null;
  faqItems?: string | null;
  visualTags?: string | null;
  useCases?: string | null;
  dynamicHeaders?: string | null;
}

export function SEOContentDisplay({ contentIntro, promptBreakdown, faqItems, visualTags, useCases, dynamicHeaders }: SEOContentDisplayProps) {
  // Parse JSON strings
  let parsedFAQ: FAQItem[] = [];
  let parsedTags: string[] = [];
  let parsedCases: string[] = [];
  let parsedHeaders: { about?: string; breakdown?: string; analysis?: string; faq?: string } = {};

  try {
    if (faqItems) parsedFAQ = JSON.parse(faqItems);
  } catch (e) {
    console.error('Failed to parse FAQ items:', e);
  }

  try {
    if (visualTags) parsedTags = JSON.parse(visualTags);
  } catch (e) {
    console.error('Failed to parse visual tags:', e);
  }

  try {
    if (useCases) parsedCases = JSON.parse(useCases);
  } catch (e) {
    console.error('Failed to parse use cases:', e);
  }

  try {
    if (dynamicHeaders) parsedHeaders = JSON.parse(dynamicHeaders);
  } catch (e) {
    console.error('Failed to parse dynamic headers:', e);
  }

  // Don't render if no content
  const hasContent = contentIntro || promptBreakdown || parsedFAQ.length > 0 || parsedTags.length > 0 || parsedCases.length > 0;
  if (!hasContent) return null;

  return (
    <div className="mt-12 space-y-8">
      {/* 1. About This [Format] */}
      {contentIntro && (
        <Card>
          <CardHeader>
            <CardTitle>{parsedHeaders.about || 'About This Prompt'}</CardTitle>
            <CardDescription>What this prompt creates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{contentIntro}</p>
          </CardContent>
        </Card>
      )}

      {/* 2. [Style] Elements Breakdown */}
      {parsedTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{parsedHeaders.breakdown || 'Visual Style'}</CardTitle>
            <CardDescription>Key characteristics of this image</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {parsedTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. [Style] Visual Analysis */}
      {promptBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle>{parsedHeaders.analysis || 'Visual Analysis'}</CardTitle>
            <CardDescription>Core elements and techniques</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed font-medium">{promptBreakdown}</p>
          </CardContent>
        </Card>
      )}

      {/* 4. FAQ: Creating [Style] Images */}
      {parsedFAQ.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{parsedHeaders.faq || 'Frequently Asked Questions'}</CardTitle>
            <CardDescription>Everything you need to know</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {parsedFAQ.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* 5. Use Cases (Optional - not part of dynamic headers) */}
      {parsedCases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Use Cases</CardTitle>
            <CardDescription>Perfect for these scenarios</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {parsedCases.map((useCase, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span className="text-foreground">{useCase}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
