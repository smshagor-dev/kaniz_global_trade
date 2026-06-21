import { ProductEditor } from '@/components/products/product-editor'

export default async function EditDashboardProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProductEditor mode="edit" portal="dashboard" productId={id} />
}
