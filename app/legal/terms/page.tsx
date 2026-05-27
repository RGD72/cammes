export const metadata = { title: 'Termos de Uso — CAMMES' }

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="space-y-8 text-sm leading-relaxed text-foreground">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Termos de Uso</h1>
          <p className="text-xs text-muted-foreground">Versão 1.0 — 27 de maio de 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">1. Dados Coletados</h2>
          <p>
            Para a operação da plataforma CAMMES, coletamos os seguintes dados pessoais:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Nome completo e endereço de e-mail (cadastro e autenticação)</li>
            <li>Número de telefone (opcional)</li>
            <li>Endereço IP e User-Agent (segurança e auditoria)</li>
            <li>Pedidos realizados e itens selecionados (histórico comercial)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. Finalidade do Tratamento</h2>
          <p>
            Os dados coletados são utilizados exclusivamente para a operação da plataforma: autenticação de usuários,
            gestão de pedidos, acesso a catálogos de marcas, auditoria de segurança e comunicações
            relacionadas ao serviço contratado.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. Base Legal (LGPD)</h2>
          <p>
            O tratamento de dados pessoais na plataforma CAMMES é fundamentado na{' '}
            <strong>Lei nº 13.709/2018 (LGPD)</strong> sob as seguintes bases legais:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Consentimento expresso</strong> (Art. 7º, I): coletado no momento do cadastro por meio
              de checkbox ativo, não pré-marcado.
            </li>
            <li>
              <strong>Execução de contrato</strong> (Art. 7º, V): dados necessários para a prestação do serviço
              de distribuição de moda contratado entre as partes.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">4. Direitos do Titular</h2>
          <p>Nos termos da LGPD (Art. 18), você tem direito a:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Confirmar a existência de tratamento de seus dados pessoais</li>
            <li>Acessar os dados que possuímos sobre você</li>
            <li>Solicitar a correção de dados incompletos ou desatualizados</li>
            <li>
              Solicitar a exclusão dos dados pessoais tratados com base em consentimento — disponível
              em <strong>/account/delete</strong>
            </li>
            <li>Revogar o consentimento a qualquer momento</li>
          </ul>
          <p>Para exercer esses direitos, entre em contato com nosso DPO.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">5. Contato do Encarregado (DPO)</h2>
          <p>
            Para dúvidas, solicitações ou reclamações relacionadas ao tratamento de dados pessoais,
            entre em contato com o Encarregado de Proteção de Dados:
          </p>
          <p className="font-medium">dpo@[empresa].com.br</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">6. Alterações nestes Termos</h2>
          <p>
            Eventuais alterações nestes Termos de Uso serão comunicadas na plataforma. O uso continuado
            após a publicação de nova versão implica aceitação das alterações.
          </p>
        </section>
      </div>
    </main>
  )
}
