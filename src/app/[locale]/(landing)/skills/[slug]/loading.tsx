import { Skeleton } from "@/shared/components/ui/skeleton";
import { Container, Section, ResponsiveGrid } from "@/shared/components/ui/layout";

export default function PromptDetailLoading() {
  return (
    <Section spacing="default" className="min-h-screen">
      <Container>
        <ResponsiveGrid>
          {/* 左侧：大图占位 */}
          <div className="w-full aspect-square rounded-2xl overflow-hidden border border-border-medium bg-card/30">
            <Skeleton className="w-full h-full" />
          </div>

          {/* 右侧：信息流占位 */}
          <div className="flex flex-col gap-6">
            {/* 标题 */}
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-8 w-1/2" />
            </div>

            {/* 作者信息栏 */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>

            {/* 参数标签 */}
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>

            {/* Prompt 文本框占位 */}
            <div className="h-48 w-full rounded-xl border border-border-medium bg-card/30 p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* 按钮组 */}
            <div className="flex gap-4">
              <Skeleton className="h-12 flex-1 rounded-full" />
              <Skeleton className="h-12 w-1/3 rounded-full" />
            </div>
          </div>
        </ResponsiveGrid>
      </Container>
    </Section>
  );
}
