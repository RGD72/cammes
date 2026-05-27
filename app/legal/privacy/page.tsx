export const metadata = { title: 'Política de Privacidade — CAMMES' }

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="space-y-8 text-sm leading-relaxed text-foreground">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Política de Privacidade</h1>
          <p className="text-xs text-muted-foreground">Versão 1.0 — 27 de maio de 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">1. Quem somos</h2>
          <p>
            A plataforma CAMMES é operada pelo distribuidor contratante. Esta Política de Privacidade
            descreve como coletamos, usamos e protegemos seus dados pessoais em conformidade com a
            Lei nº 13.709/2018 (LGPD).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. Dados que coletamos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Dados de cadastro:</strong> nome completo, e-mail, telefone (opcional)
            </li>
            <li>
              <strong>Dados de acesso:</strong> endereço IP, User-Agent do navegador, data e hora de login
            </li>
            <li>
              <strong>Dados de pedidos:</strong> itens selecionados, cores, tamanhos, quantidades e valores
            </li>
            <li>
              <strong>Dados de consentimento:</strong> versão do documento aceita, data/hora e IP de aceitação
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. Como usamos seus dados</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Autenticação e controle de acesso à plataforma</li>
            <li>Processamento e histórico de pedidos comerciais</li>
            <li>Auditoria de segurança e prevenção de fraudes</li>
            <li>Comunicações operacionais do serviço (sem fins publicitários)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">4. Base legal para o tratamento (LGPD)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Consentimento expresso</strong> (Art. 7º, I): fornecido no cadastro via checkbox ativo
            </li>
            <li>
              <strong>Execução de contrato</strong> (Art. 7º, V): dados necessários para a prestação do serviço
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">5. Retenção de dados</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Logs de auditoria:</strong> mínimo de 90 dias após o registro
            </li>
            <li>
              <strong>Dados de conta:</strong> enquanto a conta estiver ativa ou até solicitação de exclusão
            </li>
            <li>
              <strong>Histórico de pedidos:</strong> preservado para integridade contábil mesmo após exclusão
              de conta (anonimizado conforme LGPD)
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">6. Seus direitos</h2>
          <p>Você tem o direito de:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Acessar os dados que temos sobre você</li>
            <li>Corrigir dados incompletos ou incorretos</li>
            <li>Solicitar a exclusão dos dados tratados com base em consentimento</li>
            <li>Revogar o consentimento a qualquer momento</li>
            <li>Obter informações sobre compartilhamento de dados</li>
          </ul>
          <p>
            Para solicitar a exclusão da sua conta, acesse <strong>/account/delete</strong> (disponível
            em breve) ou entre em contato com o DPO.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">7. Compartilhamento de dados</h2>
          <p>
            Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins
            publicitários. Os dados podem ser compartilhados apenas quando exigido por lei ou ordem judicial.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">8. Contato do Encarregado (DPO)</h2>
          <p>
            Para exercer seus direitos ou tirar dúvidas sobre esta Política de Privacidade, entre em
            contato com nosso Encarregado de Proteção de Dados:
          </p>
          <p className="font-medium">dpo@[empresa].com.br</p>
        </section>
      </div>
    </main>
  )
}
