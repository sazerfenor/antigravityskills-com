export function UserProfileLoading() {
  return (
    <div className="container py-8">
      <div className="bg-muted mb-8 h-48 animate-pulse rounded-lg" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-muted aspect-square animate-pulse rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}
