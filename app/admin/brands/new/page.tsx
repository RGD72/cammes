import { BrandCreateForm } from './brand-create-form'

export default function NewBrandPage() {
  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-6">Nova Marca</h1>
      <BrandCreateForm />
    </div>
  )
}
