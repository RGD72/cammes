export function getCatalogStoragePath(brandId: string, fileName: string): string {
  const sanitized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
  return `${brandId}/${Date.now()}-${sanitized}`
}
