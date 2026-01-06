import { getTranslations } from 'next-intl/server';

import { Hero } from '@/themes/default/blocks/hero';

export const revalidate = 3600;

export default async function AiChatbotPage() {
  const t = await getTranslations('landing');
  const tt = await getTranslations('demo.ai-chatbot');

  return (
    <>
      <Hero
        hero={{
          title: tt.raw('title'),
          description: tt.raw('description'),
        }}
      />
    </>
  );
}
