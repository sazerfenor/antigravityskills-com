import { NextResponse } from 'next/server';
import { getAllModelConfigs } from '@/shared/config/ai-models';

/**
 * GET /api/ai/models
 * 
 * Returns all AI model configurations for the frontend.
 * This is the single source of truth for model pricing and options.
 */
export async function GET() {
  try {
    const configs = getAllModelConfigs();
    
    return NextResponse.json({
      code: 0,
      data: configs,
    });
  } catch (error: any) {
    console.error('[API] Get models failed:', error);
    return NextResponse.json({
      code: -1,
      message: error.message || 'Failed to get model configs',
    });
  }
}
