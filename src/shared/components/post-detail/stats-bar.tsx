interface StatsBarProps {
  views: number;
  likes: number;
  remixes: number;
}

export function StatsBar({ views, likes, remixes }: StatsBarProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  return (
    <div className="grid grid-cols-3 divide-x divide-white/10 bg-card/20 backdrop-blur-sm rounded-lg p-3 border border-white/5">
      <div className="text-center">
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Views</div>
        <div className="font-mono font-bold text-foreground">{formatNumber(views)}</div>
      </div>
      <div className="text-center">
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Likes</div>
        <div className="font-mono font-bold text-primary">{formatNumber(likes)}</div>
      </div>
      <div className="text-center">
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Remixes</div>
        <div className="font-mono font-bold text-foreground">{formatNumber(remixes)}</div>
      </div>
    </div>
  );
}

