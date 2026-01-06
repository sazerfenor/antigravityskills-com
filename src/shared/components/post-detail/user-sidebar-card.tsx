import Link from "next/link";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FollowButton } from "./follow-button";
import { cn } from "@/shared/lib/utils";

interface UserSidebarCardProps {
  user: {
    name: string;
    image?: string | null;
    id?: string;
  };
  createdAt: string | Date;
}

export function UserSidebarCard({ user, createdAt }: UserSidebarCardProps) {
  const initial = user.name.charAt(0).toUpperCase();
  
  return (
    <div className={cn(
      "rounded-xl p-4 flex items-center justify-between gap-3",
      "bg-card/20 backdrop-blur-sm border border-white/5",
      "transition-all duration-300",
      "hover:border-primary/50 hover:shadow-[0_0_15px_rgba(250,204,21,0.1)]"
    )}>
      <Link href={`/user/${user.id}`} className="flex items-center gap-3 min-w-0 group">
        {/* Gradient Avatar Border */}
        <div className="size-10 rounded-full bg-gradient-to-tr from-primary to-primary/70 p-[1px] shrink-0">
          {user.image ? (
            <img 
              src={user.image} 
              alt={user.name}
              className="size-full rounded-full object-cover"
            />
          ) : (
            <div className="size-full rounded-full bg-card flex items-center justify-center font-bold text-primary">
              {initial}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors cursor-pointer truncate">
            {user.name}
          </h3>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span>Updated {formatDistanceToNow(new Date(createdAt as string), { addSuffix: true })}</span>
          </div>
        </div>
      </Link>
      
      {user.id && <FollowButton userId={user.id} />}
    </div>
  );
}

