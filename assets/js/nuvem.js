/*
 * Radar de Onboarding CS — conexão com a base (Supabase)
 * ---------------------------------------------------------------
 * Os dados dos alunos NÃO ficam neste repositório. Eles ficam no Supabase,
 * protegidos por login: só e-mails cadastrados na tabela "acesso_painel"
 * conseguem ler as matrículas, os cancelamentos e o acompanhamento.
 *
 * A chave abaixo é a chave PÚBLICA do projeto (feita para ficar no navegador).
 * Sem login de um e-mail autorizado, ela não dá acesso a nenhum dado.
 */
(function () {
  const R = window.Radar; const U = R.util;
  const SUPABASE_URL = 'https://imhxeikcjdyigdayjlvx.supabase.co';
  const SUPABASE_CHAVE_PUBLICA = 'sb_publishable_4DtCxBdqGtM6A2u7N-t2Qw_wc_CTmFk';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'radar-cs:sessao' },
  });

  async function todas(tabela, colunas, filtro) {
    const passo = 1000; let de = 0; const out = [];
    for (;;) {
      let q = sb.from(tabela).select(colunas).order('id', { ascending: true }).range(de, de + passo - 1);
      if (filtro) q = filtro(q);
      const { data, error } = await q;
      if (error) throw error;
      out.push(...data);
      if (data.length < passo) return out;
      de += passo;
    }
  }

  R.nuvem = {
    async sessao() { const { data } = await sb.auth.getSession(); return data.session; },
    async entrar(email, senha) {
      const { data, error } = await sb.auth.signInWithPassword({ email: String(email).trim().toLowerCase(), password: senha });
      if (error) throw error; return data.session;
    },
    async sair() { await sb.auth.signOut(); },
    async redefinirSenha(email) {
      const { error } = await sb.auth.resetPasswordForEmail(String(email).trim().toLowerCase(), { redirectTo: location.origin + location.pathname });
      if (error) throw error;
    },
    async novaSenha(senha) { const { error } = await sb.auth.updateUser({ password: senha }); if (error) throw error; },
    aoMudarSessao(fn) { sb.auth.onAuthStateChange((ev, s) => fn(ev, s)); },
    async autorizado() {
      const { data, error } = await sb.rpc('pode_ver');
      if (error) throw error; return data === true;
    },

    /* Lê a base e devolve no mesmo formato que o painel usa. */
    async carregar() {
      const cfg = R.config; const abas = cfg.cursos.map((c) => c.aba);
      const nomeDe = Object.fromEntries(cfg.cursos.map((c) => [c.aba, c.nome]));
      const [m, c] = await Promise.all([
        todas('matriculas', 'id,aba_origem,linha_origem,data_venda,data_texto,tipo,nome,email,whatsapp,forma_pagamento,vendedor,onboarding,bonus,observacao,importado_em', (q) => q.in('aba_origem', abas)),
        todas('cancelamentos', 'id,linha_origem,nome,email,celular,data_inicio,data_cancelamento,curso,motivo,importado_em'),
      ]);
      let atualizado = null;
      const nota = (t) => { if (t && (!atualizado || t > atualizado)) atualizado = t; };
      const matriculas = m.filter((r) => U.txt(r.nome)).map((r) => { nota(r.importado_em); return {
        curso: nomeDe[r.aba_origem] || r.aba_origem, aba: r.aba_origem, linha: r.linha_origem,
        data: U.toISO(r.data_venda) || U.toISO(r.data_texto), tipo: U.tipoPadrao(r.tipo),
        nome: U.txt(r.nome).replace(/\s+/g, ' '), email: U.txt(r.email), whatsappBruto: U.txt(r.whatsapp),
        pagamento: U.txt(r.forma_pagamento), vendedor: U.titulo(r.vendedor), status: U.statusPadrao(r.onboarding),
        bonus: U.txt(r.bonus), obs: U.txt(r.observacao),
      }; });
      const cancelamentos = c.filter((r) => U.txt(r.nome)).map((r) => { nota(r.importado_em); return {
        linha: r.linha_origem, nome: U.txt(r.nome).replace(/\s+/g, ' '), email: U.txt(r.email), whatsappBruto: U.txt(r.celular),
        inicio: U.toISO(r.data_inicio), cancelamento: U.toISO(r.data_cancelamento), curso: U.txt(r.curso) || 'Sem curso', motivo: U.txt(r.motivo),
      }; });
      const avisos = [];
      abas.forEach((a) => { if (!matriculas.some((r) => r.aba === a)) avisos.push(`Nenhuma matrícula de "${nomeDe[a]}" na base.`); });
      return { matriculas, cancelamentos, avisos, atualizado };
    },

    /* Acompanhamento compartilhado entre os autorizados. */
    async acompanhamento() {
      const out = {}; const passo = 1000; let de = 0;
      for (;;) {
        const { data, error } = await sb.from('acompanhamento').select('chave,status,atualizado_em,atualizado_por').range(de, de + passo - 1);
        if (error) throw error;
        data.forEach((r) => { out[r.chave] = { status: r.status, em: r.atualizado_em, por: r.atualizado_por }; });
        if (data.length < passo) return out;
        de += passo;
      }
    },
    async marcar(chave, status) {
      const { data: ss } = await sb.auth.getSession(); const por = ss.session ? ss.session.user.email : null;
      const { error } = await sb.from('acompanhamento').upsert({ chave, status, atualizado_em: new Date().toISOString(), atualizado_por: por }, { onConflict: 'chave' });
      if (error) throw error;
    },
    async desmarcar(chave) {
      const { error } = await sb.from('acompanhamento').delete().eq('chave', chave);
      if (error) throw error;
    },
  };
})();
