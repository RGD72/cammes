export function getCatalogStoragePath(brandId: string, fileName: string): string {
  const sanitized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
  return `${brandId}/${Date.now()}-${sanitized}`
}

// Nested under brandId so the existing storage RLS policies (which check
// (storage.foldername(name))[1] = brand_id) cover page images too.
export function getCatalogPageImagePath(
  brandId: string,
  catalogId: string,
  pageNumber: number,
): string {
  return `${brandId}/${catalogId}/pages/page-${pageNumber}.jpg`
}
