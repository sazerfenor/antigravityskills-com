import { ReactNode } from "react";

interface PostLayoutProps {
  children: ReactNode; // Main Content (Image)
  sidebar: ReactNode; // Right Sidebar
  bottom?: ReactNode; // Bottom Content (Ads, SEO)
}

export function PostLayout({ children, sidebar, bottom }: PostLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-10 w-full max-w-[1600px] mx-auto">
      {/* Main Content Area (Image) - Grows to fill available space */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Right Sidebar - Sticky on Desktop, Stacked on Mobile */}
      <aside className="w-full lg:w-[400px] xl:w-[440px] shrink-0 lg:sticky lg:top-24 lg:self-start flex flex-col gap-5">
        {sidebar}
      </aside>

      {/* Bottom Content - Spans full width below layout on mobile */}
      {bottom && (
        <div className="col-span-full w-full mt-6 space-y-8">
           {bottom}
        </div>
      )}
    </div>
  );
}

