'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { inviteCustomer } from '@/lib/customers/actions';

export function InviteCustomerModal() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function handleOpen() {
    setError(null);
    setCreated(null);
    setOpen(true);
    formRef.current?.reset();
  }

  function handleClose() {
    setOpen(false);
    setError(null);
    setCreated(null);
    formRef.current?.reset();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = (fd.get('email') as string).trim();
    const fullName = (fd.get('fullName') as string).trim();
    const phone = (fd.get('phone') as string).trim();

    if (!email || !fullName) {
      setError('E-mail e nome são obrigatórios.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await inviteCustomer({ email, fullName, phone: phone || undefined });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setCreated({ email, password: result.data.defaultPassword });
      router.refresh();
    });
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

            {created ? (
              <div className="space-y-4">
                <p className="text-sm">
                  Cliente <strong>{created.email}</strong> cadastrado com sucesso.
                </p>
                <p className="rounded border bg-muted p-3 text-sm">
                  Nenhum e-mail foi enviado. Informe ao cliente que o acesso é feito com a senha
                  padrão <strong className="font-mono">{created.password}</strong> — recomende a
                  troca no primeiro acesso.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleOpen}
                    className="rounded border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Cadastrar outro
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
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

                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="invite-phone">
                    Telefone <span className="text-foreground/50">(opcional)</span>
                  </label>
                  <input
                    id="invite-phone"
                    name="phone"
                    type="tel"
                    className="w-full rounded border bg-background px-3 py-2 text-sm"
                    placeholder="(11) 91234-5678"
                  />
                </div>

                <p className="text-xs text-foreground/50">
                  O cliente terá acesso a todas as suas marcas. É possível restringir o acesso a
                  marcas específicas depois, na página do cliente.
                </p>

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
            )}
          </div>
        </div>
      )}
    </>
  );
}
