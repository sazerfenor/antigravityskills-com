import { respData, respErr } from '@/shared/lib/resp';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { handleApiError } from '@/shared/lib/api-error-handler';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const credits = await getRemainingCredits(user.id);

    return respData({ remainingCredits: credits });
  } catch (e: unknown) {
    return handleApiError(e, { feature: 'user' });
  }
}
