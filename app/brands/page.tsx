export default function BrandsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Suas Marcas</h1>
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-base font-medium">Você ainda não tem marcas disponíveis.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre em contato com seu distribuidor para liberar o acesso às marcas.
        </p>
      </div>
    </div>
  )
}
