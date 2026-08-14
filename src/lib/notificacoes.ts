// Filtro único de "notificações deste usuário", usado pelo badge (Navbar)
// e pela central de notificações — para as duas telas nunca divergirem.
export const filtroDestinatario = (userId: string) =>
  `destinatario_id.eq.${userId},destinatario_tipo.eq.todos`;
