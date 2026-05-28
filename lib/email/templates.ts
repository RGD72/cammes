export function deletionRequestedEmail(userName: string): string {
  return `
<p>Olá${userName ? ` ${userName}` : ''},</p>
<p>Recebemos sua solicitação de exclusão de conta. Seus dados pessoais serão removidos em até <strong>15 dias</strong>.</p>
<p>Você receberá uma confirmação por e-mail quando o processo for concluído.</p>
<p>— Equipe CAMMES</p>
`
}

export function deletionCompletedEmail(): string {
  return `
<p>Sua conta foi excluída conforme solicitado.</p>
<p>Seus dados pessoais foram removidos de nossos sistemas. Histórico de pedidos foi anonimizado para fins contábeis.</p>
<p>— Equipe CAMMES</p>
`
}
