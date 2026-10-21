/*
 * Radar de Onboarding CS — configuração
 * ---------------------------------------------------------------
 * Tudo o que é regra de negócio fica aqui. Para incluir um curso novo,
 * mudar prazos de prioridade ou ajustar as mensagens de WhatsApp,
 * edite este arquivo: o resto do painel se adapta sozinho.
 */
window.Radar = window.Radar || {};

Radar.config = {
  /* Abas da planilha Matriculas_Pós.xlsx que entram no painel.
     "aba" é o nome da aba na planilha; "nome" é como o curso aparece no painel. */
  cursos: [
    { aba: 'Eng. Dados e IA', nome: 'Engenharia de Dados e IA', cor: '--v-indigo' },
    { aba: 'Arquitetura Avançada de Cloud', nome: 'Arquitetura Avançada de Cloud', cor: '--v-cyan' },
    { aba: 'MBA IA ao Direito', nome: 'MBA em IA Aplicada ao Direito', cor: '--v-violet' },
    { aba: 'IA Aplicada à Negócios', nome: 'IA Aplicada a Negócios', cor: '--v-amber' },
    { aba: 'Cybersegurança', nome: 'Defesa Cibernética', cor: '--v-pink' },
  ],

  /* Aba com os cancelamentos. */
  abaCancelamentos: 'Matrículas Canceladas',

  /* Cabeçalhos aceitos para cada campo (comparados sem acento e sem maiúsculas). */
  colunas: {
    data: ['data', 'data da venda', 'data do pagamento'],
    tipo: ['tipo'],
    nome: ['nome', 'aluno', 'aluno(a)'],
    email: ['e-mail', 'email'],
    whatsapp: ['whatsapp', 'celular', 'telefone'],
    pagamento: ['forma de pagamento', 'pagamento'],
    vendedor: ['vendedor'],
    onboarding: ['onboarding'],
    bonus: ['bonus', 'bônus'],
    obs: ['observacao', 'observação'],
  },
  colunasCancelamento: {
    nome: ['aluno(a)', 'aluno', 'nome'],
    email: ['e-mail', 'email'],
    whatsapp: ['celular', 'whatsapp', 'telefone'],
    inicio: ['data de inicio', 'data de início'],
    ultimoAcesso: ['ultimo acesso', 'último acesso'],
    cancelamento: ['data do cancelamento'],
    curso: ['pos-graduacao', 'pós-graduação', 'curso'],
    motivo: ['motivo'],
  },

  /* Prioridade da fila de ação, pelos dias desde a venda. */
  prioridade: {
    baixaAte: 15,     // até 15 dias: Baixa
    mediaAte: 30,     // 16 a 30: Média
    altaAte: 90,      // 31 a 90: Alta — acima disso: Crítica
    contratoCriticoApos: 60, // contrato sem assinatura há mais de 60 dias: Crítica
  },

  /* Pendência de taxa por curso: acima de 25% = Crítico, acima de 12% = Atenção. */
  situacaoCurso: { critico: 0.25, atencao: 0.12 },

  /* Janela da lista de reversão, pelos dias desde o cancelamento. */
  janelaReversao: { recenteAte: 120, intermediariaAte: 240 },

  /* Vendedores com menos matrículas que isso ficam fora do ranking comercial. */
  minimoVendedor: 10,

  /* Categorias de motivo de cancelamento (palavras-chave no texto do motivo). */
  motivos: [
    ['Financeiro', /financ|desempreg|emprego|orçamento|orcamento|custo|valor|condições de pagar|condições de arcar|parcela|mais em conta|apertado/i],
    ['Falta de tempo', /tempo|rotina|projeto|promoção|responsabilidades|horas|prazo/i],
    ['Expectativa / conteúdo', /didat|metodolog|conteúdo|conteudo|método|metodo|técnico|tecnico|prático|pratico|programação|interação|não gostou|não atendeu|não era o curso|não me adaptei|gestão/i],
    ['Requisito acadêmico', /superior|colação|colacao|diploma|graduação/i],
    ['Processo interno', /demora|nota fiscal|anhanguera|não existe|desconfort/i],
    ['Pessoal / saúde', /saúde|saude|cirurgia|pessoais|pessoal/i],
    ['Não iniciou', /não iniciou/i],
  ],

  /* Roteiro de reversão por motivo. */
  roteiro: {
    'Financeiro': 'Oferecer renegociação: parcela menor, nova data de vencimento ou pausa de cobrança',
    'Falta de tempo': 'Propor retomada em outra turma, no ritmo do aluno, lembrando o acesso aos conteúdos',
    'Expectativa / conteúdo': 'Apresentar a trilha prática, mentorias e certificações incluídas',
    'Processo interno': 'Reconhecer a falha, mostrar que foi resolvida e oferecer um bônus de compensação',
    'Requisito acadêmico': 'Agendar contato para depois da colação de grau e reabrir a matrícula',
    'Pessoal / saúde': 'Contato acolhedor, sem pressão; deixar a porta aberta para retomar',
    'Não iniciou': 'Reapresentar o curso e oferecer um onboarding guiado',
    'Não informado': 'Ligar para entender o motivo, registrar e avaliar uma oferta de retorno',
    'Outros': 'Ligar para entender o motivo, registrar e avaliar uma oferta de retorno',
  },

  /* Tipos de bônus reconhecidos no campo "Bônus" (palavras-chave). */
  bonus: [
    ['Treinamento de certificações', /certifica[cç]|az ?900|az ?104|dp-?900|voucher/i],
    ['Acesso vitalício', /vital/i],
    ['Aulas de inglês', /ingl|inlges/i],
    ['Estágio', /est[aá]gio/i],
    ['Aceleração EmpregaDados', /empregadados|acelera/i],
    ['Sorteio MacBook', /sorteio|macbook/i],
    ['Mentoria', /mentoria|encontros/i],
    ['Radar de vagas', /radar|grupo de vagas/i],
    ['2ª pós (IA p/ Negócios)', /p[oó]s (de )?ia|ia para neg|ia neg/i],
    ['Workshop / camisa / outros', /workshop|camisa|ingresso|imad|mastermind|linkedin/i],
    ['Cashback', /ca[s]?chback|cash back/i],
  ],

  /* Mensagens prontas de WhatsApp. {nome} e {curso} são trocados automaticamente. */
  mensagens: {
    matricula: 'Olá, {nome}! Aqui é do time de Sucesso do Aluno da pós em {curso}. Vi que a sua matrícula ainda não foi concluída e quero te ajudar a finalizar. Ficou faltando algum documento ou alguma dúvida? Estou à disposição.',
    contrato: 'Olá, {nome}! Aqui é do time de Sucesso do Aluno da pós em {curso}. Vi que o seu contrato ainda está aguardando assinatura. Quer que eu reenvie o link ou te ajude com alguma dúvida para liberarmos seu acesso?',
    reversao: 'Olá, {nome}! Aqui é do time de Sucesso do Aluno. Passando para saber como você está e entender melhor o que te levou a pausar a pós. Temos algumas condições novas e quero ver se faz sentido para você retomar. Podemos conversar?',
  },
};
