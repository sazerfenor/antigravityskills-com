import { getAllConfigs } from '@/shared/models/config';
import { requireAdminAccess } from '@/core/rbac/permission';
import { respData, respErr } from '@/shared/lib/resp';
import { getStorageService } from '@/shared/services/storage';

/**
 * GET /api/admin/storage/list
 * List all objects in storage bucket with optional prefix filter
 * ✅ 使用标准 StorageProvider.listFiles() 接口
 * 
 * Query params:
 *   - prefix: filter by path prefix (e.g., "ai/image/generated/")
 *   - cursor: pagination cursor for continued listing
 *   - limit: max number of objects to return (default 100, max 1000)
 */
export async function GET(request: Request) {
  // Check admin permission
  await requireAdminAccess({});

  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const cursor = url.searchParams.get('cursor') || undefined;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);

    // ✅ 使用标准 Storage Provider 接口
    const storageService = await getStorageService();
    const provider = storageService.getProvider('r2');

    if (!provider) {
      return respErr('Storage provider not configured');
    }

    if (!provider.listFiles) {
      return respErr('Storage provider does not support listFiles');
    }

    const result = await provider.listFiles({ prefix, cursor, limit });

    // 获取 domain 配置用于预览
    const configs = await getAllConfigs();
    
    console.log(`[Storage List] Found ${result.totalCount} objects, prefix: "${prefix}"`);

    return respData({
      ...result,
      domain: configs.r2_domain || '',
    });
  } catch (e: any) {
    console.error('[Storage List] Error:', e.message);
    return respErr(e.message);
  }
}

/**
 * DELETE /api/admin/storage/list
 * Delete an object from storage bucket
 * ✅ 使用标准 StorageProvider.deleteFile() 接口
 * 
 * Body: { key: string }
 */
export async function DELETE(request: Request) {
  // Check admin permission
  await requireAdminAccess({});

  try {
    const { key }: { key?: string } = await request.json();

    if (!key) {
      return respErr('Object key is required');
    }

    // ✅ 使用标准 Storage Provider 接口
    const storageService = await getStorageService();
    const provider = storageService.getProvider('r2');

    if (!provider) {
      return respErr('Storage provider not configured');
    }

    if (!provider.deleteFile) {
      return respErr('Storage provider does not support deleteFile');
    }

    const result = await provider.deleteFile(key);

    if (!result.success) {
      return respErr(result.error || 'Delete failed');
    }

    console.log(`[Storage Delete] Deleted: ${key}`);
    return respData({ deleted: key });
  } catch (e: any) {
    console.error('[Storage Delete] Error:', e.message);
    return respErr(e.message);
  }
}

