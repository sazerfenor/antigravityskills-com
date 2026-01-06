import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { optimizeCasePrompt } from '../optimize/route';

/**
 * POST /api/admin/cases/generate-embeddings
 * 为结构化数据生成 embeddings（可复用）
 */
export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      throw new Error('unauthorized');
    }

    const body = await request.json() as {
      subject: string;
      style: string;
      composition: string;
      technique: string;
    };

    const { subject, style, composition, technique } = body;

    if (!subject || !style || !composition || !technique) {
      throw new Error('Missing required fields');
    }

    console.log('[Generate Embeddings] Generating embeddings for structured data');

    // 调用核心函数
    const embeddings = await generateStructuredEmbeddings({
      subject,
      style,
      composition,
      technique,
    });

    return respData(embeddings);
  } catch (error: any) {
    console.error('[Generate Embeddings] Error:', error);
    return respErr(error.message);
  }
}

/**
 * 核心函数：生成结构化 embeddings（可复用）
 * ✅ 使用标准 Provider 接口
 */
export async function generateStructuredEmbeddings(data: {
  subject: string;
  style: string;
  composition: string;
  technique: string;
}) {
  const { subject, style, composition, technique } = data;

  // ✅ 使用标准 AI Provider 接口
  const { getAIService } = await import('@/shared/services/ai');
  const aiService = await getAIService();
  const geminiProvider = aiService.getProvider('gemini');

  if (!geminiProvider) {
    throw new Error('Gemini provider not configured');
  }

  if (!geminiProvider.embed) {
    throw new Error('Gemini provider does not support embed method');
  }

  const embedModel = 'text-embedding-004';

  console.log('[Generate Embeddings] Generating 4 embeddings via provider.embed()...');

  // 并行生成所有 embeddings（使用标准 embed() 方法）
  const [subjectEmbed, styleEmbed, compositionEmbed, techniqueEmbed] = await Promise.all([
    geminiProvider.embed({ text: subject, model: embedModel }),
    geminiProvider.embed({ text: style, model: embedModel }),
    geminiProvider.embed({ text: composition, model: embedModel }),
    geminiProvider.embed({ text: technique, model: embedModel }),
  ]);

  console.log('[Generate Embeddings] ✅ All embeddings generated');

  return {
    subject: subjectEmbed,
    style: styleEmbed,
    composition: compositionEmbed,
    technique: techniqueEmbed,
    dimensions: subjectEmbed.length, // 通常是 768
  };
}

