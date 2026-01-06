import { redirect } from 'next/navigation';

export const revalidate = 3600;

// 功能暂未开放，重定向到首页
export default function AiMusicGeneratorPage() {
  redirect('/');
}
