'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inviteCustomer } from '@/lib/customers/actions'

interface Brand {
  id: string
  name: string
}

interface Props {
  brands: Brand[]
}

export function InviteCustomerModal({ brands }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  function handleOpen() {
    setError(null)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setError(null)
    formRef.current?.reset()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = (fd.get('email') as string).trim()
    const fullName = (fd.get('fullName') as string).trim()
    const brandIds = fd.getAll('brandIds') as string[]

    if (!email || !fullName) {
      setError('E-mail e nome são obrigatórios.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await inviteCustomer({ email, fullName, brandIds })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      handleClose()
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90"
      >
        Convidar cliente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">Convidar cliente</h2>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="invite-email">
                  E-mail
                </label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                  placeholder="lojista@exemplo.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="invite-name">
                  Nome completo
                </label>
                <input
                  id="invite-name"
                  name="fullName"
                  type="text"
                  required
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                  placeholder="Ana Silva"
                />
              </div>

              {brands.length > 0 && (
                <fieldset>
                  <legend className="mb-1 text-sm font-medium">Marcas</legend>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded border p-2">
                    {brands.map((b) => (
                      <label key={b.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" name="brandIds" value={b.id} />
                        {b.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="rounded border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Enviando...' : 'Enviar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
