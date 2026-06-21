import { ProductEditor } from '@/components/products/product-editor'

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProductEditor mode="edit" portal="admin" productId={id} />
}
