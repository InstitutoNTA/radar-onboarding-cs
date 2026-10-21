/*
 * Radar de Onboarding CS — leitura da planilha e cálculos
 * ---------------------------------------------------------------
 * Normaliza os registros (vindos do Supabase ou de uma planilha) e calcula os indicadores.
 */
(function () {
  const R = window.Radar;
  const C = () => R.config;

  /* ---------- utilidades ---------- */
  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const txt = (v) => { if (v == null) return null; const s = String(v).replace(/ /g, ' ').trim(); return s || null; };
  const MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  const iso = (y, m, d) => `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  function toISO(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number' && v > 20000 && v < 80000) { // número de série do Excel
      const d = new Date(Math.round((v - 25569) * 86400000));
      return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    if (v instanceof Date && !isNaN(v)) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
    const s = String(v).trim().toLowerCase();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) { let y = +m[3]; if (y < 100) y += 2000; return iso(y, +m[2], +m[1]); }
    m = s.match(/^(\d{1,2})-(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)-(\d{2,4})$/);
    if (m) { let y = +m[3]; if (y < 100) y += 2000; return iso(y, MESES[m[2]], +m[1]); }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return iso(+m[1], +m[2], +m[3]);
    return null;
  }
  const dias = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
  const hojeISO = () => { const d = new Date(); return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()); };

  function statusPadrao(v) {
    const s = norm(v);
    if (!s) return null;
    if (s === 'ok') return 'OK';
    if (s.startsWith('em matr')) return 'Em matrícula';
    if (s === 'em contrato') return 'Em contrato';
    if (s === 'cancelado') return 'Cancelado';
    if (s === 'nao') return 'Não';
    if (s === 'iniciado') return 'Iniciado';
    return txt(v);
  }
  function tipoPadrao(v) {
    const s = norm(v);
    if (!s) return null;
    if (['completa', 'completo', 'compelta'].includes(s)) return 'Completa';
    if (s.includes('extens')) return 'Extensão';
    if (s.startsWith('forma')) return 'Formação';
    if (s === 'minipos') return 'MiniPós';
    if (s === 'cancelado') return 'Cancelado';
    return txt(v);
  }
  const titulo = (v) => { const s = txt(v); return s ? s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : null; };
  function whatsapp(v) {
    let d = String(v == null ? '' : v).replace(/\D/g, '');
    if (d.length === 10 || d.length === 11) d = '55' + d;
    return (d.length === 12 || d.length === 13) && d.startsWith('55') ? d : '';
  }
  const foneFmt = (d) => { if (!d) return ''; const n = d.slice(2); return `(${n.slice(0, 2)}) ${n.slice(2, -4)}-${n.slice(-4)}`; };
  function meioPagamento(p) {
    const s = txt(p); if (!s) return 'Não informado';
    if (/boleto/i.test(s)) return 'Boleto';
    if (/cart/i.test(s)) return 'Cartão';
    if (/vista|^1x|^[\d.,]+$/i.test(s)) return 'À vista';
    if (/\d+\s*x/i.test(s)) return 'Parcelado (sem meio)';
    return 'Outro';
  }
  function parcelas(p) {
    const m = String(p || '').match(/(\d{1,2})\s*[xX]\s*(?:de\s*)?(?:R\$)?\s*([\d.]+,\d{2}|\d+)/);
    if (!m) return null;
    const n = +m[1]; const v = m[2].includes(',') ? +m[2].replace(/\./g, '').replace(',', '.') : +m[2];
    if (n < 1 || n > 36 || v < 50 || v > 6000) return null;
    return { n, v };
  }
  const bonusTags = (b) => { const s = txt(b); if (!s || /^(sem|-)/i.test(s)) return []; return C().bonus.filter(([, rx]) => rx.test(s)).map(([n]) => n); };
  const motivoCat = (m) => { const s = txt(m); if (!s) return 'Não informado'; const hit = C().motivos.find(([, rx]) => rx.test(s)); return hit ? hit[0] : 'Outros'; };

  /* ---------- leitura da planilha ---------- */
  function achaAba(wb, nome) {
    const alvo = norm(nome);
    return wb.SheetNames.find((n) => norm(n) === alvo) || wb.SheetNames.find((n) => norm(n).startsWith(alvo) || alvo.startsWith(norm(n)));
  }
  function mapaColunas(header, defs) {
    const h = header.map(norm); const idx = {};
    Object.entries(defs).forEach(([campo, nomes]) => { const alvos = nomes.map(norm); const i = h.findIndex((x) => alvos.includes(x)); idx[campo] = i; });
    return idx;
  }

  R.lerPlanilha = function (wb) {
    const cfg = C(); const avisos = []; const matriculas = []; const cancelamentos = [];
    cfg.cursos.forEach((curso) => {
      const aba = achaAba(wb, curso.aba);
      if (!aba) { avisos.push(`Aba "${curso.aba}" não encontrada: o curso ${curso.nome} ficou de fora.`); return; }
      const linhas = XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, raw: true, defval: null, blankrows: false });
      if (!linhas.length) return;
      const ix = mapaColunas(linhas[0], cfg.colunas);
      if (ix.nome < 0) { avisos.push(`A aba "${aba}" não tem a coluna Nome.`); return; }
      const g = (row, k) => (ix[k] >= 0 ? row[ix[k]] : null);
      linhas.slice(1).forEach((row, i) => {
        if (!row || !row.some((v) => txt(v))) return;
        const nome = txt(g(row, 'nome')); if (!nome) return;
        matriculas.push({
          curso: curso.nome, aba, linha: i + 2, data: toISO(g(row, 'data')), tipo: tipoPadrao(g(row, 'tipo')),
          nome: nome.replace(/\s+/g, ' '), email: txt(g(row, 'email')), whatsappBruto: txt(g(row, 'whatsapp')),
          pagamento: txt(g(row, 'pagamento')), vendedor: titulo(g(row, 'vendedor')), status: statusPadrao(g(row, 'onboarding')),
          bonus: txt(g(row, 'bonus')), obs: txt(g(row, 'obs')),
        });
      });
    });
    const abaC = achaAba(wb, cfg.abaCancelamentos);
    if (!abaC) avisos.push(`Aba "${cfg.abaCancelamentos}" não encontrada: a lista de reversão ficou vazia.`);
    else {
      const linhas = XLSX.utils.sheet_to_json(wb.Sheets[abaC], { header: 1, raw: true, defval: null, blankrows: false });
      const ix = mapaColunas(linhas[0] || [], cfg.colunasCancelamento);
      const g = (row, k) => (ix[k] >= 0 ? row[ix[k]] : null);
      linhas.slice(1).forEach((row, i) => {
        if (!row || !row.some((v) => txt(v))) return;
        const nome = txt(g(row, 'nome')); if (!nome) return;
        cancelamentos.push({ linha: i + 2, nome: nome.replace(/\s+/g, ' '), email: txt(g(row, 'email')), whatsappBruto: txt(g(row, 'whatsapp')), inicio: toISO(g(row, 'inicio')),
          cancelamento: toISO(g(row, 'cancelamento')), curso: txt(g(row, 'curso')) || 'Sem curso', motivo: txt(g(row, 'motivo')) });
      });
    }
    return { matriculas, cancelamentos, avisos };
  };

  /* ---------- cálculos ---------- */
  R.analisar = function (bruto, hoje) {
    hoje = hoje || hojeISO();
    const cfg = C(); const P = cfg.prioridade;
    const base = bruto.matriculas;
    const pend = (r) => r.status === 'Em matrícula' || r.status === 'Em contrato';
    const diasDe = (r) => (r.data ? dias(r.data, hoje) : null);
    const cursos = cfg.cursos.map((c) => c.nome).filter((n) => base.some((r) => r.curso === n));

    // resumo
    const pendentes = base.filter(pend);
    const cancel = bruto.cancelamentos;
    const durs = cancel.filter((c) => c.inicio && c.cancelamento).map((c) => dias(c.inicio, c.cancelamento)).filter((d) => d >= 0).sort((a, b) => a - b);
    const mediana = durs.length ? (durs.length % 2 ? durs[(durs.length - 1) / 2] : (durs[durs.length / 2 - 1] + durs[durs.length / 2]) / 2) : null;
    const resumo = {
      total: base.length, concluidos: base.filter((r) => r.status === 'OK').length, pendentes: pendentes.length,
      pendentes30: pendentes.filter((r) => r.data && diasDe(r) > 30).length, pendentes90: pendentes.filter((r) => r.data && diasDe(r) > 90).length,
      cancelamentos: cancel.length, medianaCancelar: mediana == null ? null : Math.round(mediana), hoje,
    };

    // status por curso
    const statusCurso = cursos.map((c) => {
      const rs = base.filter((r) => r.curso === c);
      const n = (s) => rs.filter((r) => r.status === s).length;
      const o = { curso: c, total: rs.length, ok: n('OK'), em_matricula: n('Em matrícula'), em_contrato: n('Em contrato'), cancelado: n('Cancelado') };
      o.outros = o.total - o.ok - o.em_matricula - o.em_contrato - o.cancelado; return o;
    });

    // tempo parado
    const faixa = (d) => (d <= 15 ? '0-15' : d <= 30 ? '16-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : d <= 180 ? '91-180' : '180+');
    const aging = [];
    cursos.forEach((c) => ['0-15', '16-30', '31-60', '61-90', '91-180', '180+'].forEach((f) => {
      const n = pendentes.filter((r) => r.curso === c && r.data && faixa(diasDe(r)) === f).length; if (n) aging.push({ curso: c, faixa: f, n });
    }));
    const cursoResumo = statusCurso.map((s) => {
      const p = s.em_matricula + s.em_contrato; const taxa = s.total ? p / s.total : 0;
      const ps = pendentes.filter((r) => r.curso === s.curso && r.data);
      return { curso: s.curso, total: s.total, pendentes: p, taxa, mais30: ps.filter((r) => diasDe(r) > 30).length, mais90: ps.filter((r) => diasDe(r) > 90).length,
        situacao: taxa >= cfg.situacaoCurso.critico ? 'Crítico' : taxa >= cfg.situacaoCurso.atencao ? 'Atenção' : 'Sob controle' };
    });

    // vendas por mês
    const vendasMes = {};
    base.forEach((r) => { if (!r.data) return; const m = r.data.slice(0, 7); vendasMes[m] = vendasMes[m] || {}; vendasMes[m][r.curso] = (vendasMes[m][r.curso] || 0) + 1; });

    // vendedores
    const porVend = {};
    base.forEach((r) => { if (!r.vendedor) return; const v = porVend[r.vendedor] = porVend[r.vendedor] || { vendedor: r.vendedor, total: 0, ok: 0, pendentes: 0, cancelados: 0 };
      v.total++; if (r.status === 'OK') v.ok++; if (pend(r)) v.pendentes++; if (r.status === 'Cancelado') v.cancelados++; });
    const vendedores = Object.values(porVend).filter((v) => v.total >= cfg.minimoVendedor).map((v) => ({ ...v, taxa: v.pendentes / v.total })).sort((a, b) => b.pendentes - a.pendentes || b.total - a.total);

    // fila de ação
    function acao(r, d) {
      const obs = norm(r.obs);
      if (obs.includes('colar grau') || obs.includes('colacao')) return ['Média', 'Aguardando colação de grau: agendar retorno e manter o aluno nas aulas abertas'];
      if (r.status === 'Em contrato') {
        if (d <= P.baixaAte) return ['Baixa', 'Confirmar o envio do contrato e combinar prazo de assinatura'];
        if (d <= P.contratoCriticoApos) return ['Alta', 'Cobrar a assinatura do contrato por WhatsApp e ligação'];
        return ['Crítica', `Escalar ao comercial: contrato sem assinatura há mais de ${P.contratoCriticoApos} dias`];
      }
      if (d <= P.baixaAte) return ['Baixa', 'Enviar boas-vindas e checklist de documentos'];
      if (d <= P.mediaAte) return ['Média', 'Lembrete de documentação pendente por WhatsApp'];
      if (d <= P.altaAte) return ['Alta', 'Ligar para destravar a matrícula e ajudar com os documentos'];
      if (d <= 180) return ['Crítica', 'Contato do coordenador, usando os bônus como incentivo para concluir'];
      return ['Crítica', 'Auditar no sistema: se já está ativo, atualizar a planilha; se não, tratar como risco de cancelamento'];
    }
    const ORD = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };
    const fila = pendentes.map((r) => {
      const d = r.data ? diasDe(r) : 999; const [prioridade, ac] = acao(r, d); const w = whatsapp(r.whatsappBruto);
      return { chave: chave('f-', r), nome: r.nome, curso: r.curso, status: r.status, dias: r.data ? d : null, venda: r.data, prioridade, acao: ac, whatsapp: w,
        telefone: foneFmt(w) || r.whatsappBruto || 'Sem número válido', email: r.email || '', vendedor: r.vendedor || '—', pagamento: r.pagamento || 'Não informado',
        meio: meioPagamento(r.pagamento), bonus: r.bonus || 'Sem bônus registrado', bonusTags: bonusTags(r.bonus), linha: r.linha, aba: r.aba };
    }).sort((a, b) => ORD[a.prioridade] - ORD[b.prioridade] || (b.dias ?? 0) - (a.dias ?? 0));

    // reversão
    const porEmail = {};
    base.forEach((r) => { if (r.email) { const k = r.email.toLowerCase(); (porEmail[k] = porEmail[k] || []).push(r); } });
    const JO = { 'Recente': 0, 'Intermediária': 1, 'Antiga': 2, 'Sem data': 3 };
    const reversao = cancel.map((c) => {
      const ms = (porEmail[(c.email || '').toLowerCase()] || []).slice().sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
      const m = ms[0]; const dc = c.cancelamento ? dias(c.cancelamento, hoje) : null; const k = motivoCat(c.motivo); const tags = bonusTags(m && m.bonus);
      const janela = dc == null ? 'Sem data' : dc <= cfg.janelaReversao.recenteAte ? 'Recente' : dc <= cfg.janelaReversao.intermediariaAte ? 'Intermediária' : 'Antiga';
      let ac = cfg.roteiro[k]; if (tags.length) ac += '. Reforçar o que ele já tem: ' + tags.slice(0, 3).join(', ').toLowerCase();
      const w = whatsapp(c.whatsappBruto);
      return { chave: chave('r-', c), nome: c.nome, curso: c.curso, cancelamento: c.cancelamento, diasDesde: dc, diasAteCancelar: c.inicio && c.cancelamento ? dias(c.inicio, c.cancelamento) : null,
        janela, motivo: k, acao: ac, whatsapp: w, telefone: foneFmt(w) || c.whatsappBruto || 'Sem número válido', email: c.email || '', bonus: (m && m.bonus) || 'Sem bônus registrado',
        bonusTags: tags, pagamento: (m && m.pagamento) || 'Não informado', vendedor: (m && m.vendedor) || '—' };
    }).sort((a, b) => JO[a.janela] - JO[b.janela] || (a.diasDesde ?? 1e9) - (b.diasDesde ?? 1e9));

    // bônus
    const arsenal = cfg.bonus.map(([n]) => ({ bonus: n, alunos: base.filter((r) => bonusTags(r.bonus).includes(n)).length, pendentes: fila.filter((r) => r.bonusTags.includes(n)).length }))
      .filter((x) => x.alunos).sort((a, b) => b.alunos - a.alunos);

    // pagamentos
    const MEIOS = ['Boleto', 'Cartão', 'À vista', 'Parcelado (sem meio)', 'Não informado', 'Outro'];
    const pagRisco = MEIOS.map((m) => { const rs = base.filter((r) => meioPagamento(r.pagamento) === m); return { meio: m, total: rs.length, pendentes: rs.filter(pend).length, taxa: rs.length ? rs.filter(pend).length / rs.length : 0 }; }).filter((x) => x.total);
    const pagMeioCurso = []; cursos.forEach((c) => MEIOS.forEach((m) => { const n = base.filter((r) => r.curso === c && meioPagamento(r.pagamento) === m).length; if (n) pagMeioCurso.push({ curso: c, meio: m, n }); }));
    const PB = ['1x', '2 a 6x', '7 a 12x', '13 a 18x', '19 a 24x', '25x ou mais']; const parcN = {}; const valores = {};
    base.forEach((r) => { const p = parcelas(r.pagamento); if (!p) return; const b = p.n === 1 ? '1x' : p.n <= 6 ? '2 a 6x' : p.n <= 12 ? '7 a 12x' : p.n <= 18 ? '13 a 18x' : p.n <= 24 ? '19 a 24x' : '25x ou mais';
      parcN[b] = (parcN[b] || 0) + 1; (valores[r.curso] = valores[r.curso] || []).push(p); });
    const pagParcelas = PB.filter((b) => parcN[b]).map((b) => ({ faixa: b, n: parcN[b] }));
    const pagValor = cursos.filter((c) => valores[c]).map((c) => { const L = valores[c]; const L2 = L.filter((p) => p.n > 1);
      return { curso: c, contratos: L.length, parcelasMedia: L2.length ? L2.reduce((s, p) => s + p.n, 0) / L2.length : null, parcelaMedia: L2.length ? L2.reduce((s, p) => s + p.v, 0) / L2.length : null, totalMedio: L.reduce((s, p) => s + p.n * p.v, 0) / L.length }; });

    // cancelamentos
    const contar = (arr, f) => { const o = {}; arr.forEach((x) => { const k = f(x); if (k != null) o[k] = (o[k] || 0) + 1; }); return o; };
    const cancMotivo = Object.entries(contar(cancel, (c) => motivoCat(c.motivo))).map(([motivo, n]) => ({ motivo, n })).sort((a, b) => b.n - a.n);
    const cancMes = Object.entries(contar(cancel, (c) => (c.cancelamento ? c.cancelamento.slice(0, 7) : null))).map(([mes, n]) => ({ mes, n })).sort((a, b) => a.mes.localeCompare(b.mes));
    const fx = (d) => (d <= 7 ? '0-7' : d <= 30 ? '8-30' : d <= 90 ? '31-90' : d <= 180 ? '91-180' : '180+');
    const cancDias = Object.entries(contar(durs, fx)).map(([faixa, n]) => ({ faixa, n }));
    const cancCurso = Object.entries(contar(cancel, (c) => c.curso)).map(([curso, n]) => ({ curso, n })).sort((a, b) => b.n - a.n);

    // qualidade
    const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(e || '');
    const qualidade = cursos.map((c) => { const rs = base.filter((r) => r.curso === c); return { curso: c, total: rs.length,
      emailInvalido: rs.filter((r) => !emailOk(r.email)).length, foneSuspeito: rs.filter((r) => { const n = String(r.whatsappBruto || '').replace(/\D/g, '').length; return n < 12 || n > 13; }).length,
      semPagamento: rs.filter((r) => !r.pagamento).length }; });
    const formaPagamento = MEIOS.map((m) => ({ forma: m, n: base.filter((r) => meioPagamento(r.pagamento) === m).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);

    const piorCurso = cursoResumo.slice().sort((a, b) => b.taxa - a.taxa)[0];
    return { resumo, cursos, statusCurso, aging, cursoResumo, piorCurso, vendasMes, vendedores, fila, reversao, arsenal, pagRisco, pagMeioCurso, pagParcelas, pagValor,
      cancMotivo, cancMes, cancDias, cancCurso, qualidade, formaPagamento };
  };

  /* Chave estável do aluno para o acompanhamento: e-mail (ou nome) + iniciais do curso. */
  function chave(prefixo, r) {
    const base = norm(r.email || r.nome).replace(/[^a-z0-9_\-.~:@+]/g, '_').slice(0, 120);
    const c = norm(r.curso).split(/[^a-z]+/).filter(Boolean).map((w) => w[0]).join('');
    return prefixo + base + '~' + c;
  }

  R.util = { norm, txt, toISO, dias, hojeISO, whatsapp, foneFmt, meioPagamento, parcelas, bonusTags, motivoCat, statusPadrao, tipoPadrao, titulo };
})();
