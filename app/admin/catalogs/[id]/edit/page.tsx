import { CatalogForm } from '@/components/admin/catalog-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminEditCatalogPage({ params }: Props) {
  const { id } = await params
  return <CatalogForm mode="edit" catalogId={id} />
}
