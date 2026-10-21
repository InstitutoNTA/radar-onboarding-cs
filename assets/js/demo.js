/*
 * Radar de Onboarding CS — dados de EXEMPLO
 * ---------------------------------------------------------------
 * Pessoas, e-mails e telefones abaixo são inventados e gerados por sorteio.
 * Servem só para demonstrar o painel sem expor nenhum aluno real.
 */
(function () {
  const R = window.Radar;
  R.gerarDemo = function (hojeISO) {
    let seed = 20261021;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const pesos = (pares) => { const t = pares.reduce((s, p) => s + p[1], 0); let x = rnd() * t; for (const [v, w] of pares) { x -= w; if (x <= 0) return v; } return pares[0][0]; };
    const nomes = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Isadora', 'João', 'Karen', 'Lucas', 'Marina', 'Nicolas', 'Olívia', 'Paulo', 'Rafaela', 'Samuel', 'Tatiane', 'Vinícius', 'Yasmin', 'Otávio', 'Letícia', 'Renan', 'Beatriz', 'Caio', 'Débora', 'Enzo', 'Flávia', 'Gustavo'];
    const sobren = ['Exemplo', 'Fictício', 'Demonstração', 'Modelo', 'Teste', 'Amostra', 'Simulado', 'Protótipo'];
    const vendedores = ['Vendedor A', 'Vendedor B', 'Vendedor C', 'Vendedor D', 'Vendedor E', 'Vendedor F', 'Vendedor G'];
    const bonus = ['Acesso vitalício, Estágio', 'Treinamento das Certificações, Aulas de inglês', 'Aceleração EmpregaDados, Mentoria', 'Radar de vagas', 'Sorteio MacBook, Estágio', 'Acesso vitalício', null, null];
    const pag = ['Boleto', 'Cartão de Crédito', '12x349,70', '18x297,00', '24x237,19', '3497,00 à vista', null];
    const cursos = R.config.cursos.map((c) => c.nome);
    const base = Date.parse((hojeISO || '2026-10-21') + 'T12:00:00Z');
    const dataAtras = (d) => new Date(base - d * 86400000).toISOString().slice(0, 10);
    const matriculas = []; const cancelamentos = [];
    for (let i = 0; i < 640; i++) {
      const curso = pesos([[cursos[0], 45], [cursos[1], 18], [cursos[2], 18], [cursos[3], 13], [cursos[4], 6]]);
      const d = Math.floor(Math.pow(rnd(), 1.4) * 600);
      const pendP = curso === cursos[2] ? 0.34 : curso === cursos[4] ? 0.28 : 0.11;
      const p = pick(pag); const boleto = p === 'Boleto';
      let status = rnd() < (boleto ? pendP * 1.8 : pendP) * (d < 40 ? 2.2 : 1) ? (rnd() < 0.75 ? 'Em matrícula' : 'Em contrato') : (rnd() < 0.03 ? 'Cancelado' : 'OK');
      const nome = `${pick(nomes)} ${pick(sobren)} ${String(i + 1).padStart(3, '0')}`;
      matriculas.push({ curso, aba: curso, linha: i + 2, data: dataAtras(d), tipo: 'Completa', nome, email: `aluno.exemplo${i + 1}@exemplo.com`,
        whatsappBruto: '5500900000' + String(i).padStart(3, '0'), pagamento: p, vendedor: pick(vendedores), status, bonus: pick(bonus), obs: null });
    }
    const motivos = ['Falta de tempo para estudar', 'Problema financeiro, perdeu o emprego', 'Não gostou da didática', null, null, 'Não tinha colação de grau', 'Demora para liberar a matrícula'];
    for (let i = 0; i < 46; i++) {
      const ini = Math.floor(rnd() * 500) + 30; const dur = Math.floor(Math.pow(rnd(), 1.6) * 200);
      cancelamentos.push({ linha: i + 2, nome: `${pick(nomes)} ${pick(sobren)} C${String(i + 1).padStart(2, '0')}`, email: i < 20 ? `aluno.exemplo${i * 7 + 3}@exemplo.com` : `cancelado.exemplo${i}@exemplo.com`,
        whatsappBruto: '5500911111' + String(i).padStart(3, '0'), inicio: dataAtras(ini), cancelamento: dataAtras(Math.max(1, ini - dur)), curso: pick(['Eng.dados e IA', 'MBA Direito', 'Arquit.Cloud Azure', 'IA Aplicada Negócio']), motivo: pick(motivos) });
    }
    return { matriculas, cancelamentos, avisos: [], demo: true };
  };
})();
