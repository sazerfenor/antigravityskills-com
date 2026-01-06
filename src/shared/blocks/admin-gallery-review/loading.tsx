export function AdminGalleryLoading() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(9)].map((_, i) => (
        <div
          key={i}
          className="bg-muted aspect-square animate-pulse rounded-lg"
        />
      ))}
    </div>
  );
}
