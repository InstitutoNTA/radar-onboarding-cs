/*
 * Radar de Onboarding CS — interface
 */
(function () {
  const R = window.Radar; const cfg = R.config; const U = R.util;
  const $ = (id) => document.getElementById(id);
  const nf = new Intl.NumberFormat('pt-BR');
  const pf = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mesLabel = (s) => { const [y, m] = s.split('-'); return MES[+m - 1] + '/' + y.slice(2); };
  const dataBR = (s) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
  const css = (v) => `var(${v})`;
  const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } } };
  const K_DADOS = 'radar-cs:dados', K_ACOMP = 'radar-cs:acompanhamento', K_TEMA = 'radar-cs:tema';

  const STATUS = [['ok', 'Concluído', '--v-mint'], ['em_matricula', 'Em matrícula', '--v-amber'], ['em_contrato', 'Em contrato', '--v-orange'], ['cancelado', 'Cancelado', '--v-coral'], ['outros', 'Outros / sem status', '--v-slate']];
  const PRIO = ['Crítica', 'Alta', 'Média', 'Baixa'];
  const PRIO_COR = { 'Crítica': css('--v-coral'), 'Alta': css('--v-orange'), 'Média': css('--v-amber'), 'Baixa': css('--v-mint') };
  const PRIO_CLS = { 'Crítica': 'p-critica', 'Alta': 'p-alta', 'Média': 'p-media', 'Baixa': 'p-baixa' };
  const JANELAS = ['Recente', 'Intermediária', 'Antiga', 'Sem data'];
  const JAN_COR = { 'Recente': css('--v-coral'), 'Intermediária': css('--v-orange'), 'Antiga': css('--v-slate'), 'Sem data': css('--v-slate') };
  const JAN_CLS = { 'Recente': 'p-critica', 'Intermediária': 'p-alta', 'Antiga': 'p-cinza', 'Sem data': 'p-cinza' };
  const MEIOS = ['Boleto', 'Cartão', 'À vista', 'Parcelado (sem meio)', 'Não informado', 'Outro'];
  const MEIO_COR = { 'Boleto': css('--v-amber'), 'Cartão': css('--v-indigo'), 'À vista': css('--v-mint'), 'Parcelado (sem meio)': css('--v-violet'), 'Não informado': css('--v-slate'), 'Outro': css('--v-pink') };
  const FAIXAS = ['0-15', '16-30', '31-60', '61-90', '91-180', '180+'];
  const FAIXA_NOME = { '0-15': 'até 15 dias', '16-30': '16 a 30', '31-60': '31 a 60', '61-90': '61 a 90', '91-180': '91 a 180', '180+': 'mais de 180' };
  const DIAS = ['0-7', '8-30', '31-90', '91-180', '180+'];
  const OPC_FILA = ['Não contatado', 'Contatado', 'Sem resposta', 'Resolvido'];
  const OPC_REV = ['Não contatado', 'Contatado', 'Sem resposta', 'Revertido', 'Não quer voltar'];
  const COR_ACOMP = { 'Contatado': css('--v-indigo'), 'Sem resposta': css('--v-orange'), 'Resolvido': css('--v-mint'), 'Revertido': css('--v-mint'), 'Não quer voltar': css('--v-coral') };
  const corCurso = (c) => { const k = cfg.cursos.find((x) => x.nome === c); return css(k ? k.cor : '--v-slate'); };

  let A = null; let meta = null; let pagina = 'visao';
  let acomp = ls.get(K_ACOMP) || {};

  /* ---------- helpers de DOM ---------- */
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const pill = (t, c) => el('span', 'pill ' + c, t);
  const tip = $('tip');
  const showTip = (ev, nodes) => { tip.replaceChildren(...nodes); tip.hidden = false; const tw = tip.offsetWidth, th = tip.offsetHeight; let x = ev.clientX + 14, y = ev.clientY - th - 10; if (x + tw > innerWidth - 8) x = ev.clientX - tw - 14; if (y < 8) y = ev.clientY + 16; tip.style.left = x + 'px'; tip.style.top = y + 'px'; };
  const hideTip = () => { tip.hidden = true; };
  const tH = (t) => el('div', 'h', t);
  const tR = (cor, t) => { const r = el('div', 'r'); if (cor) { const i = el('i'); i.style.background = cor; r.appendChild(i); } r.appendChild(el('span', null, t)); return r; };
  const hover = (node, f) => { node.addEventListener('mousemove', (ev) => showTip(ev, f())); node.addEventListener('mouseleave', hideTip); };
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 2600); }
  function legend(box, items) { box.replaceChildren(...items.map(([n, c]) => { const s = el('span'); const i = el('i'); i.style.background = c; s.append(i, document.createTextNode(n)); return s; })); }
  function opcoes(sel, todos, vals, atual) { sel.replaceChildren(new Option(todos, ''), ...vals.map((v) => new Option(v, v))); sel.value = vals.includes(atual) ? atual : ''; }
  const cellBar = (v, max) => { const w = el('span', 'cellbar'); const b = el('span', 'b'); b.style.width = Math.max(2, (v / (max || 1)) * 80) + 'px'; w.append(b, document.createTextNode(pf.format(v))); return w; };

  /* ---------- tema ---------- */
  function aplicaTema(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
  aplicaTema(ls.get(K_TEMA));
  $('btn-tema').addEventListener('click', () => {
    const atual = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const novo = atual === 'dark' ? 'light' : 'dark'; aplicaTema(novo); ls.set(K_TEMA, novo); desenhar();
  });

  /* ---------- carregar planilha ---------- */
  function lerArquivo(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const wb = XLSX.read(new Uint8Array(fr.result), { type: 'array' });
        const bruto = R.lerPlanilha(wb);
        if (!bruto.matriculas.length) { toast('Não encontrei matrículas nesse arquivo. Confira se é a planilha Matriculas_Pós.xlsx.'); return; }
        iniciar(bruto, { arquivo: file.name, carregadoEm: new Date().toISOString(), demo: false }, true);
        toast(`Planilha carregada: ${nf.format(bruto.matriculas.length)} matrículas e ${nf.format(bruto.cancelamentos.length)} cancelamentos.`);
      } catch (e) { console.error(e); toast('Não consegui ler esse arquivo. Envie um .xlsx exportado do Excel.'); }
    };
    fr.readAsArrayBuffer(file);
  }
  $('arquivo').addEventListener('change', (e) => { lerArquivo(e.target.files[0]); e.target.value = ''; });
  $('arquivo2').addEventListener('change', (e) => { lerArquivo(e.target.files[0]); e.target.value = ''; });
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); if (t === 'dragleave' && e.target !== document.documentElement && e.relatedTarget) return; drop.classList.remove('over'); }));
  document.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) lerArquivo(f); });
  $('btn-demo').addEventListener('click', () => iniciar(R.gerarDemo(U.hojeISO()), { arquivo: 'dados de exemplo', carregadoEm: new Date().toISOString(), demo: true }, false));
  $('btn-limpar').addEventListener('click', () => {
    ls.del(K_DADOS); A = null; meta = null; $('painel').hidden = true; $('drop').hidden = false; $('hero-acoes').hidden = true; $('estado-dados').hidden = true;
    $('take').textContent = 'Dados apagados deste navegador. Carregue a cópia da planilha para ver o painel de novo.'; toast('Dados dos alunos apagados deste navegador. O acompanhamento continua salvo.');
  });

  function iniciar(bruto, m, salvar) {
    meta = m; meta.bruto = bruto;
    A = R.analisar(bruto, U.hojeISO());
    if (salvar) { if (!ls.set(K_DADOS, { meta: { arquivo: m.arquivo, carregadoEm: m.carregadoEm }, bruto })) toast('Não deu para guardar a planilha neste navegador; recarregue o arquivo na próxima vez.'); }
    $('drop').hidden = true; $('painel').hidden = false; $('hero-acoes').hidden = false;
    abrir(location.hash.slice(1) || pagina, false);
  }

  /* ---------- acompanhamento (salvo neste navegador) ---------- */
  const stAtual = (k) => (acomp[k] && acomp[k].status) || 'Não contatado';
  function acompCell(chave, opts, redesenha) {
    const td = el('td', 'nw'); const sel = el('select', 'acomp'); sel.setAttribute('aria-label', 'Acompanhamento');
    opts.forEach((o) => sel.add(new Option(o, o))); const st = stAtual(chave); sel.value = opts.includes(st) ? st : opts[0]; sel.dataset.st = sel.value;
    const metaEl = el('div', 'acomp-meta', acomp[chave] ? 'em ' + new Date(acomp[chave].em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
    sel.addEventListener('change', () => {
      if (sel.value === opts[0]) delete acomp[chave]; else acomp[chave] = { status: sel.value, em: new Date().toISOString() };
      if (!ls.set(K_ACOMP, acomp)) toast('Não foi possível salvar o acompanhamento neste navegador.');
      redesenha();
    });
    td.append(sel, metaEl); return td;
  }
  function progresso(box, rows, opts) {
    const cont = {}; opts.forEach((o) => { cont[o] = 0; }); rows.forEach((r) => { cont[stAtual(r.chave)] = (cont[stAtual(r.chave)] || 0) + 1; });
    const feitos = rows.length - cont['Não contatado'];
    const top = el('div', 'progress-top'); const l = el('span'); l.append(el('b', null, nf.format(feitos)), document.createTextNode(` de ${nf.format(rows.length)} já tiveram algum contato (${pf.format(rows.length ? feitos / rows.length : 0)})`));
    top.append(l, el('span', 'cap', opts.slice(1).map((o) => `${o}: ${nf.format(cont[o])}`).join(' · ')));
    const bar = el('div', 'progress-bar'); opts.slice(1).forEach((o) => { if (!cont[o]) return; const d = el('div'); d.style.width = (cont[o] / rows.length * 100) + '%'; d.style.background = COR_ACOMP[o]; d.title = `${o}: ${cont[o]}`; bar.appendChild(d); });
    box.replaceChildren(top, bar);
  }
  $('ac-exp').addEventListener('click', () => baixar(`acompanhamento-radar-${U.hojeISO()}.json`, JSON.stringify({ tipo: 'radar-cs-acompanhamento', exportadoEm: new Date().toISOString(), itens: acomp }, null, 1), 'application/json'));
  $('ac-imp-file').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return; const fr = new FileReader();
    fr.onload = () => { try { const j = JSON.parse(fr.result); const itens = j && j.itens; if (!itens || typeof itens !== 'object') throw 0; let n = 0;
      Object.entries(itens).forEach(([k, v]) => { if (!v || typeof v.status !== 'string') return; if (!acomp[k] || String(v.em) > String(acomp[k].em)) { acomp[k] = { status: String(v.status).slice(0, 40), em: String(v.em || new Date().toISOString()) }; n++; } });
      ls.set(K_ACOMP, acomp); toast(`${nf.format(n)} marcações importadas.`); desenhar(); } catch (err) { toast('Esse arquivo não é um acompanhamento exportado pelo Radar.'); } };
    fr.readAsText(f); e.target.value = '';
  });

  /* ---------- exportar CSV ---------- */
  function baixar(nome, conteudo, tipo) { const b = new Blob([conteudo], { type: tipo }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function csv(rows, cols) { const esc = (v) => { const s = v == null ? '' : String(v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return '﻿' + [cols.map((c) => esc(c[0])).join(';')].concat(rows.map((r) => cols.map((c) => esc(typeof c[1] === 'function' ? c[1](r) : r[c[1]])).join(';'))).join('\n'); }

  /* ---------- mensagens de WhatsApp ---------- */
  const primeiro = (n) => (n || '').trim().split(/\s+/)[0].toLowerCase().replace(/^./, (c) => c.toUpperCase());
  const msg = (modelo, r) => modelo.replace('{nome}', primeiro(r.nome)).replace('{curso}', r.curso);
  function contato(r, texto) {
    const box = el('div', 'contact');
    if (r.whatsapp) { const a = el('a', 'btn sm wa', 'WhatsApp'); a.href = `https://wa.me/${r.whatsapp}?text=${encodeURIComponent(texto)}`; a.target = '_blank'; a.rel = 'noopener'; box.appendChild(a); }
    const c = el('button', 'btn sm', 'Copiar mensagem'); c.type = 'button';
    c.addEventListener('click', () => { const ok = () => { c.textContent = 'Copiada ✓'; setTimeout(() => { c.textContent = 'Copiar mensagem'; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(texto).then(ok, () => toast(texto)); else toast(texto); });
    box.appendChild(c); return box;
  }

  /* ---------- ordenação ---------- */
  const sortState = {}; const PORD = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };
  function sortable(id, defK, defDir, redraw) {
    const t = $(id); sortState[id] = sortState[id] || { k: defK, dir: defDir };
    t.querySelectorAll('th button').forEach((b) => { if (b.dataset.bound) return; b.dataset.bound = 1; b.addEventListener('click', () => { const s = sortState[id]; if (s.k === b.dataset.k) s.dir = -s.dir; else { s.k = b.dataset.k; s.dir = b.dataset.k === 'prioridade' ? 1 : -1; } redraw(); }); });
    t.querySelectorAll('th').forEach((th) => { const b = th.querySelector('button'); if (b) th.setAttribute('aria-sort', b.dataset.k === sortState[id].k ? (sortState[id].dir < 0 ? 'descending' : 'ascending') : 'none'); });
    return (rows) => { const { k, dir } = sortState[id]; return rows.slice().sort((a, b) => {
      if (k === 'prioridade') return ((PORD[a.prioridade] - PORD[b.prioridade]) || ((b.dias ?? 0) - (a.dias ?? 0))) * dir;
      const x = a[k], y = b[k]; return (typeof x === 'number' || typeof y === 'number' ? (x ?? -1) - (y ?? -1) : String(x).localeCompare(String(y), 'pt-BR')) * dir; }); };
  }

  /* ---------- cabeçalho ---------- */
  function cabecalho() {
    const r = A.resumo; const est = $('estado-dados'); est.hidden = false; est.classList.toggle('demo', !!meta.demo);
    est.textContent = meta.demo ? 'Dados de exemplo (fictícios)' : `Base de ${dataBR(r.hoje)}`;
    const t = $('take'); t.replaceChildren();
    const b = (x) => el('b', null, x);
    const pior = A.piorCurso; const bol = A.pagRisco.find((x) => x.meio === 'Boleto');
    t.append(b(nf.format(r.pendentes)), document.createTextNode(` alunos (${pf.format(r.total ? r.pendentes / r.total : 0)}) ainda não concluíram o onboarding e `), b(nf.format(r.pendentes30)), document.createTextNode(' estão parados há mais de 30 dias.'));
    if (pior) t.append(document.createTextNode(' O maior gargalo está em '), b(pior.curso), document.createTextNode(` (${pf.format(pior.taxa)} pendente).`));
    if (bol && bol.total >= 20) t.append(document.createTextNode(' Quem paga no boleto trava '), b(pf.format(bol.taxa)), document.createTextNode(' das vezes.'));
    const cont = (p) => A.fila.filter((x) => x.prioridade === p).length;
    const acoes = $('hero-acoes'); acoes.replaceChildren(...PRIO.map((p) => { const bt = el('button', 'hbtn'); bt.type = 'button'; const i = el('i'); i.style.background = PRIO_COR[p];
      bt.append(i, el('strong', null, nf.format(cont(p))), document.createTextNode(p === 'Crítica' ? ' prioridade crítica' : ' ' + p.toLowerCase()));
      bt.addEventListener('click', () => { filtro.prio = p; abrir('fila', true); }); return bt; }));
    const rv = el('button', 'hbtn'); rv.type = 'button'; const i = el('i'); i.style.background = css('--v-cyan'); rv.append(i, el('strong', null, nf.format(A.reversao.length)), document.createTextNode(' para reverter'));
    rv.addEventListener('click', () => abrir('reversao', true)); acoes.appendChild(rv);
    $('n-fila').textContent = nf.format(A.fila.length); $('n-rev').textContent = nf.format(A.reversao.length);
    const info = $('status-info'); info.replaceChildren();
    info.append(el('span', null, `Arquivo: ${meta.arquivo}`), el('span', null, `Carregado em ${new Date(meta.carregadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`), el('span', null, `${nf.format(r.total)} matrículas · ${nf.format(r.cancelamentos)} cancelamentos`));
    const av = meta.bruto.avisos || []; $('avisos').hidden = !av.length; $('avisos').textContent = av.join(' ');
    $('fila-regra').textContent = `Ordenada da prioridade crítica para a baixa e, dentro dela, de quem está parado há mais tempo. Até ${cfg.prioridade.baixaAte} dias desde a venda é baixa, até ${cfg.prioridade.mediaAte} média, até ${cfg.prioridade.altaAte} alta e acima disso crítica. Contratos sem assinatura há mais de ${cfg.prioridade.contratoCriticoApos} dias também são críticos. O botão de WhatsApp abre a conversa com uma mensagem pronta para você ajustar antes de enviar.`;
    $('rev-regra').textContent = `Ordenada pela janela: recentes (até ${cfg.janelaReversao.recenteAte} dias desde o cancelamento), intermediárias (até ${cfg.janelaReversao.intermediariaAte}) e antigas. Só aparece a categoria do motivo, nunca o texto que o aluno escreveu.`;
    $('vend-regra').textContent = `Vendedores com ${cfg.minimoVendedor} ou mais matrículas. Taxa alta indica alunos que compraram mas não avançaram na matrícula: vale alinhar o repasse com o comercial.`;
  }

  /* ---------- gráficos genéricos ---------- */
  function eixoY(svg, y, ml, W, mr) {
    svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y).attr('y2', y).attr('stroke', 'var(--grid)');
    svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', ml - 6).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--muted)').style('font-size', '12px').text((v) => nf.format(v));
  }
  function vbars(box, cats, val, label, cor, H, unidade) {
    const W = box.clientWidth; if (!W) return; const ml = 34, mr = 6, mt = 22, mb = 26;
    const x = d3.scaleBand(cats, [ml, W - mr]).padding(0.25); const y = d3.scaleLinear([0, d3.max(cats, val) || 1], [H - mb, mt]).nice();
    const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img');
    eixoY(svg, y, ml, W, mr);
    const passo = Math.max(1, Math.ceil(cats.length / Math.max(2, Math.floor(W / 58))));
    svg.append('g').selectAll('text').data(cats.filter((c, i) => i % passo === 0 || (i === cats.length - 1 && i % passo >= Math.ceil(passo / 2)))).join('text').attr('x', (c) => x(c) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', 'var(--muted)').style('font-size', '12px').text(label);
    const bw = Math.min(34, x.bandwidth()); const vis = cats.filter((c) => val(c) > 0);
    svg.append('g').selectAll('rect').data(vis).join('rect').attr('x', (c) => x(c) + (x.bandwidth() - bw) / 2).attr('width', bw).attr('y', (c) => y(val(c))).attr('height', (c) => y(0) - y(val(c))).attr('rx', 5).attr('fill', (c) => cor(c, val(c)))
      .on('mousemove', (ev, c) => showTip(ev, [tH(label(c)), tR(null, nf.format(val(c)) + ' ' + unidade)])).on('mouseleave', hideTip);
    if (bw >= 18) svg.append('g').selectAll('text').data(vis).join('text').attr('x', (c) => x(c) + x.bandwidth() / 2).attr('y', (c) => y(val(c)) - 6).attr('text-anchor', 'middle').attr('fill', 'var(--fg)').style('font-size', '12px').style('font-weight', 650).text((c) => nf.format(val(c)));
    box.replaceChildren(svg.node());
  }
  function hbars(box, rows, label, val, cor, texto, tipF) {
    const max = d3.max(rows, val) || 1; const soma = d3.sum(rows, val) || 1;
    box.replaceChildren(...rows.map((r) => { const row = el('div', 'hbar'); const tr = el('div', 'track'); const f = el('div', 'fill anim'); f.style.width = (val(r) / max * 100) + '%'; f.style.background = cor(r); tr.appendChild(f);
      row.append(el('span', 'l', label(r)), tr, el('span', 'v', texto ? texto(r) : `${nf.format(val(r))} · ${pf.format(val(r) / soma)}`)); if (tipF) hover(row, () => tipF(r)); return row; }));
  }
  function stacked(box, grupos) {
    box.replaceChildren(...grupos.map((g) => { const row = el('div', 'stack-row'); const top = el('div', 'stack-top'); top.append(el('span', 't', g.titulo), el('span', 'p', g.sub));
      const bar = el('div', 'stack-bar anim'); g.partes.forEach((p) => { if (!p.n) return; const s = el('div'); s.style.width = (p.n / g.total * 100) + '%'; s.style.background = p.cor; hover(s, () => [tH(g.titulo), tR(p.cor, `${p.nome}: ${nf.format(p.n)} (${pf.format(p.n / g.total)})`)]); bar.appendChild(s); });
      row.append(top, bar); return row; }));
  }

  /* ---------- páginas ---------- */
  function kpi(cls, l, v, s) { const d = el('div', 'kpi ' + cls); d.append(el('div', 'l', l), el('div', 'v', v), el('div', 's', s)); return d; }
  function pgVisao() {
    const r = A.resumo;
    $('kpis').replaceChildren(
      kpi('c-indigo', 'Matrículas na base', nf.format(r.total), `${A.cursos.length} cursos de pós e MBA`),
      kpi('c-mint', 'Onboarding concluído', pf.format(r.total ? r.concluidos / r.total : 0), `${nf.format(r.concluidos)} alunos com status OK`),
      kpi('c-amber', 'Onboarding pendente', nf.format(r.pendentes), `Em matrícula ou em contrato · ${pf.format(r.total ? r.pendentes / r.total : 0)}`),
      kpi('c-coral', 'Parados há mais de 30 dias', nf.format(r.pendentes30), `${pf.format(r.pendentes ? r.pendentes30 / r.pendentes : 0)} dos pendentes`),
      kpi('c-pink', 'Parados há mais de 90 dias', nf.format(r.pendentes90), 'Prioridade máxima de contato'),
      kpi('c-cyan', 'Cancelamentos registrados', nf.format(r.cancelamentos), r.medianaCancelar == null ? 'Sem datas suficientes' : `Mediana de ${nf.format(r.medianaCancelar)} dias até cancelar`));
    legend($('leg-status'), STATUS.map(([, n, c]) => [n, css(c)]));
    stacked($('ch-status'), A.statusCurso.map((s) => ({ titulo: s.curso, total: s.total, sub: `${pf.format((s.em_matricula + s.em_contrato) / s.total)} pendente · ${nf.format(s.total)} alunos`, partes: STATUS.map(([k, n, c]) => ({ nome: n, n: s[k], cor: css(c) })) })));
    legend($('leg-cursos'), A.cursos.map((c) => [c, corCurso(c)]));
    const box = $('ch-vendas'); const W = box.clientWidth; if (!W) return;
    const meses = Object.keys(A.vendasMes).sort(); const tab = meses.map((m) => { const o = { mes: m }; A.cursos.forEach((c) => { o[c] = A.vendasMes[m][c] || 0; }); return o; });
    const series = d3.stack().keys(A.cursos)(tab); const H = 270, ml = 36, mr = 8, mt = 10, mb = 26;
    const x = d3.scaleBand(meses, [ml, W - mr]).padding(0.2); const y = d3.scaleLinear([0, d3.max(tab, (t) => d3.sum(A.cursos, (c) => t[c])) || 1], [H - mb, mt]).nice();
    const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Novas matrículas por mês');
    eixoY(svg, y, ml, W, mr);
    const passo = Math.max(1, Math.ceil(meses.length / Math.max(2, Math.floor(W / 64))));
    svg.append('g').selectAll('text').data(meses.filter((m, i) => i % passo === 0 || (i === meses.length - 1 && i % passo >= Math.ceil(passo / 2)))).join('text').attr('x', (m) => x(m) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', 'var(--muted)').style('font-size', '12px').text(mesLabel);
    series.forEach((s, i) => svg.append('g').attr('fill', corCurso(s.key)).selectAll('rect').data(s).join('rect').attr('x', (p) => x(p.data.mes)).attr('width', x.bandwidth()).attr('y', (p) => y(p[1])).attr('height', (p) => Math.max(0, y(p[0]) - y(p[1]))).attr('rx', i === series.length - 1 ? 3 : 0));
    svg.append('g').selectAll('rect').data(tab).join('rect').attr('x', (t) => x(t.mes)).attr('width', x.bandwidth()).attr('y', mt).attr('height', H - mb - mt).attr('fill', 'transparent')
      .on('mousemove', (ev, t) => showTip(ev, [tH(`${mesLabel(t.mes)} · ${nf.format(d3.sum(A.cursos, (c) => t[c]))} matrículas`), ...A.cursos.filter((c) => t[c]).map((c) => tR(corCurso(c), `${c}: ${nf.format(t[c])}`))])).on('mouseleave', hideTip);
    box.replaceChildren(svg.node());
  }

  function chips(box, lista, contar, ativo, onPick, cores) {
    box.replaceChildren(...[['', 'Todas']].concat(lista.map((p) => [p, p])).map(([v, n]) => { const b = el('button', 'chip'); b.type = 'button'; b.setAttribute('aria-pressed', String(ativo === v));
      if (v && cores[v]) { b.style.setProperty('--chip', cores[v]); const i = el('i'); i.style.background = cores[v]; b.appendChild(i); }
      b.append(document.createTextNode(n + ' '), el('b', null, nf.format(contar(v)))); b.addEventListener('click', () => onPick(v)); return b; }));
  }
  const filtro = { prio: '', curso: '', status: '', meio: '', acomp: '', busca: '' };
  let filaVisivel = [];
  function pgFila() {
    const rows = A.fila; const sorter = sortable('tb-fila', 'prioridade', 1, pgFila);
    opcoes($('f-curso'), 'Todos os cursos', A.cursos.filter((c) => rows.some((r) => r.curso === c)), filtro.curso);
    opcoes($('f-meio'), 'Todos os pagamentos', MEIOS.filter((m) => rows.some((r) => r.meio === m)), filtro.meio);
    $('f-status').value = filtro.status; $('f-acomp').value = filtro.acomp;
    progresso($('f-progress'), rows, OPC_FILA);
    const q = U.norm(filtro.busca);
    const base = rows.filter((r) => (!filtro.curso || r.curso === filtro.curso) && (!filtro.status || r.status === filtro.status) && (!filtro.meio || r.meio === filtro.meio) && (!filtro.acomp || stAtual(r.chave) === filtro.acomp) && (!q || U.norm([r.nome, r.email, r.vendedor, r.bonus, r.telefone].join(' ')).includes(q)));
    chips($('f-prio'), PRIO, (v) => base.filter((r) => !v || r.prioridade === v).length, filtro.prio, (v) => { filtro.prio = v; pgFila(); }, PRIO_COR);
    filaVisivel = sorter(base.filter((r) => !filtro.prio || r.prioridade === filtro.prio));
    $('f-count').textContent = `Mostrando ${nf.format(filaVisivel.length)} de ${nf.format(rows.length)} alunos`;
    $('tb-fila').tBodies[0].replaceChildren(...filaVisivel.map((r) => { const tr = el('tr'); const p = el('td', 'nw'); p.appendChild(pill(r.prioridade, PRIO_CLS[r.prioridade]));
      const ct = el('td'); ct.appendChild(contato(r, msg(r.status === 'Em contrato' ? cfg.mensagens.contrato : cfg.mensagens.matricula, r)));
      const st = el('td', 'nw'); st.appendChild(pill(r.status, r.status === 'Em contrato' ? 'p-alta' : 'p-media'));
      tr.append(p, acompCell(r.chave, OPC_FILA, pgFila), el('td', 'nome', r.nome), ct, el('td', 'acao', r.acao), el('td', 'nw', r.curso), st, el('td', 'num', r.dias == null ? '—' : nf.format(r.dias)),
        el('td', 'nw', r.telefone), el('td', 'nw', r.email), el('td', 'nw', r.vendedor), el('td', 'nw', r.pagamento), el('td', 'bonus', r.bonus)); return tr; }));
  }
  ['f-curso', 'f-status', 'f-meio', 'f-acomp'].forEach((id) => $(id).addEventListener('change', (e) => { filtro[{ 'f-curso': 'curso', 'f-status': 'status', 'f-meio': 'meio', 'f-acomp': 'acomp' }[id]] = e.target.value; pgFila(); }));
  $('f-busca').addEventListener('input', (e) => { filtro.busca = e.target.value; pgFila(); });
  $('f-csv').addEventListener('click', () => baixar(`fila-de-acao-${U.hojeISO()}.csv`, csv(filaVisivel, [['Prioridade', 'prioridade'], ['Acompanhamento', (r) => stAtual(r.chave)], ['Aluno', 'nome'], ['Curso', 'curso'], ['Status', 'status'], ['Dias parado', 'dias'], ['Ação sugerida', 'acao'], ['WhatsApp', 'telefone'], ['E-mail', 'email'], ['Vendedor', 'vendedor'], ['Pagamento', 'pagamento'], ['Bônus', 'bonus']]), 'text/csv;charset=utf-8'));

  const rfil = { janela: '', motivo: '', acomp: '', busca: '' }; let revVisivel = [];
  function pgReversao() {
    const rows = A.reversao;
    $('rev-kpis').replaceChildren(
      kpi('c-cyan', 'Alunos cancelados', nf.format(rows.length), 'Registrados na aba de cancelamentos'),
      kpi('c-coral', `Cancelaram há até ${cfg.janelaReversao.recenteAte} dias`, nf.format(rows.filter((r) => r.janela === 'Recente').length), 'Melhor janela para reverter'),
      kpi('c-violet', 'Tinham bônus contratado', nf.format(rows.filter((r) => r.bonusTags.length).length), 'Argumento pronto para a conversa'),
      kpi('c-amber', 'Sem motivo registrado', nf.format(rows.filter((r) => r.motivo === 'Não informado').length), 'Ligar primeiro para entender'));
    const pal = ['--v-indigo', '--v-violet', '--v-cyan', '--v-mint', '--v-amber', '--v-pink', '--v-orange'];
    const ars = $('ch-arsenal'); const max = d3.max(A.arsenal, (x) => x.alunos) || 1;
    ars.replaceChildren(...A.arsenal.map((r, i) => { const row = el('div', 'hbar'); const t = el('div', 'track'); const f = el('div', 'fill anim'); f.style.width = (r.alunos / max * 100) + '%'; f.style.background = css(pal[i % pal.length]);
      const f2 = el('div', 'fill2'); f2.style.width = (r.pendentes / max * 100) + '%'; t.append(f, f2); row.append(el('span', 'l', r.bonus), t, el('span', 'v', `${nf.format(r.alunos)} · ${nf.format(r.pendentes)} pend.`));
      hover(row, () => [tH(r.bonus), tR(css(pal[i % pal.length]), `${nf.format(r.alunos)} alunos na base`), tR(css('--v-coral'), `${nf.format(r.pendentes)} pendentes com este bônus`)]); return row; }));
    const mot = Object.keys(cfg.roteiro).map((m) => ({ m, n: rows.filter((r) => r.motivo === m).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
    hbars($('ch-roteiro'), mot, (r) => r.m, (r) => r.n, (r) => (r.m === 'Não informado' ? css('--v-slate') : css('--v-cyan')), (r) => `${nf.format(r.n)} alunos`, (r) => [tH(`${r.m} · ${nf.format(r.n)} alunos`), tR(null, cfg.roteiro[r.m])]);
    opcoes($('r-motivo'), 'Todos os motivos', mot.map((x) => x.m), rfil.motivo); $('r-acomp').value = rfil.acomp;
    progresso($('r-progress'), rows, OPC_REV);
    const q = U.norm(rfil.busca);
    const base = rows.filter((r) => (!rfil.motivo || r.motivo === rfil.motivo) && (!rfil.acomp || stAtual(r.chave) === rfil.acomp) && (!q || U.norm([r.nome, r.curso, r.bonus, r.vendedor, r.email].join(' ')).includes(q)));
    chips($('r-janela'), JANELAS.filter((j) => rows.some((r) => r.janela === j)), (v) => base.filter((r) => !v || r.janela === v).length, rfil.janela, (v) => { rfil.janela = v; pgReversao(); }, JAN_COR);
    revVisivel = base.filter((r) => !rfil.janela || r.janela === rfil.janela);
    $('r-count').textContent = `Mostrando ${nf.format(revVisivel.length)} de ${nf.format(rows.length)} alunos`;
    $('tb-rev').tBodies[0].replaceChildren(...revVisivel.map((r) => { const tr = el('tr'); const j = el('td', 'nw'); j.appendChild(pill(r.janela, JAN_CLS[r.janela]));
      const ct = el('td'); ct.appendChild(contato(r, msg(cfg.mensagens.reversao, r))); const mo = el('td', 'nw'); mo.appendChild(pill(r.motivo, r.motivo === 'Não informado' ? 'p-cinza' : 'p-neutra'));
      tr.append(j, acompCell(r.chave, OPC_REV, pgReversao), el('td', 'nome', r.nome), ct, el('td', 'acao', r.acao), mo, el('td', 'nw', r.curso), el('td', 'num', r.diasDesde == null ? '—' : nf.format(r.diasDesde)),
        el('td', 'nw', r.telefone), el('td', 'bonus', r.bonus), el('td', 'nw', r.pagamento), el('td', 'nw', r.vendedor)); return tr; }));
  }
  $('r-motivo').addEventListener('change', (e) => { rfil.motivo = e.target.value; pgReversao(); });
  $('r-acomp').addEventListener('change', (e) => { rfil.acomp = e.target.value; pgReversao(); });
  $('r-busca').addEventListener('input', (e) => { rfil.busca = e.target.value; pgReversao(); });
  $('r-csv').addEventListener('click', () => baixar(`lista-de-reversao-${U.hojeISO()}.csv`, csv(revVisivel, [['Janela', 'janela'], ['Acompanhamento', (r) => stAtual(r.chave)], ['Aluno', 'nome'], ['Curso', 'curso'], ['Cancelamento', (r) => dataBR(r.cancelamento)], ['Dias desde o cancelamento', 'diasDesde'], ['Motivo', 'motivo'], ['Ação de reversão', 'acao'], ['WhatsApp', 'telefone'], ['E-mail', 'email'], ['Bônus', 'bonus'], ['Pagamento', 'pagamento'], ['Vendedor', 'vendedor']]), 'text/csv;charset=utf-8'));

  function pgGargalos() {
    const tb = $('ch-heat'); const max = d3.max(A.aging, (x) => x.n) || 1;
    const head = el('tr'); head.appendChild(el('th', null, 'Dias parado →')); FAIXAS.forEach((f) => head.appendChild(el('th', null, FAIXA_NOME[f]))); head.appendChild(el('th', null, 'Total'));
    const body = el('tbody');
    A.cursos.filter((c) => A.aging.some((x) => x.curso === c)).forEach((c) => { const tr = el('tr'); tr.appendChild(el('th', 'row', c)); let tot = 0;
      FAIXAS.forEach((f, fi) => { const h = A.aging.find((x) => x.curso === c && x.faixa === f); const n = h ? h.n : 0; tot += n; const td = el('td', null, n ? nf.format(n) : '·'); const a = n ? 0.14 + 0.8 * (n / max) : 0;
        const hue = fi < 2 ? '--v-amber' : fi < 4 ? '--v-orange' : '--v-coral';
        td.style.background = n ? `color-mix(in srgb, var(${hue}) ${Math.round(a * 100)}%, transparent)` : 'color-mix(in srgb, var(--v-slate) 8%, transparent)';
        td.style.color = a > 0.55 ? '#fff' : (n ? 'var(--fg)' : 'var(--muted)');
        if (n) hover(td, () => [tH(c), tR(null, `${nf.format(n)} alunos parados ${f === '180+' ? 'há mais de 180 dias' : 'entre ' + f.replace('-', ' e ') + ' dias'}`)]); tr.appendChild(td); });
      const tt = el('td', null, nf.format(tot)); tt.style.background = 'color-mix(in srgb, var(--v-indigo) 12%, transparent)'; tr.appendChild(tt); body.appendChild(tr); });
    const th = el('thead'); th.appendChild(head); tb.replaceChildren(th, body);
    const sorter = sortable('tb-cursos', 'taxa', -1, pgGargalos); const mx = d3.max(A.cursoResumo, (r) => r.taxa);
    $('tb-cursos').tBodies[0].replaceChildren(...sorter(A.cursoResumo).map((r) => { const tr = el('tr'); tr.append(el('td', 'nome', r.curso), el('td', 'num', nf.format(r.total)), el('td', 'num', nf.format(r.pendentes)));
      const t = el('td', 'num'); t.appendChild(cellBar(r.taxa, mx)); tr.appendChild(t); tr.append(el('td', 'num', nf.format(r.mais30)), el('td', 'num', nf.format(r.mais90)));
      const p = el('td'); p.appendChild(pill(r.situacao, r.situacao === 'Crítico' ? 'p-critica' : r.situacao === 'Atenção' ? 'p-media' : 'p-baixa')); tr.appendChild(p); return tr; }));
  }

  function pgPagamentos() {
    const g = (m) => A.pagRisco.find((x) => x.meio === m); const bol = g('Boleto'), car = g('Cartão'), vis = g('À vista');
    const ins = $('pag-insight'); ins.replaceChildren();
    const ord = A.pagRisco.filter((x) => x.total >= 20 && x.meio !== 'Não informado' && x.meio !== 'Outro' && !x.meio.startsWith('Parcelado')).sort((a, b) => b.taxa - a.taxa);
    if (ord.length) { const top = ord[0]; ins.append(el('strong', null, `${top.meio} é o meio de pagamento com mais onboarding travado: `), document.createTextNode(`${pf.format(top.taxa)} dos alunos estão pendentes`));
      const outros = ord.slice(1).map((x) => `${pf.format(x.taxa)} no ${x.meio.toLowerCase()}`); if (outros.length) ins.append(document.createTextNode(', contra ' + outros.join(' e ')));
      ins.append(document.createTextNode(`. Na fila de ação, filtre por "${top.meio}" para atacar esse grupo primeiro.`)); }
    else ins.textContent = 'Ainda não há registros suficientes de meio de pagamento para comparar.';
    hbars($('ch-risco'), A.pagRisco, (r) => r.meio, (r) => r.taxa, (r) => MEIO_COR[r.meio], (r) => `${pf.format(r.taxa)} · ${nf.format(r.pendentes)} de ${nf.format(r.total)}`);
    const PB = ['1x', '2 a 6x', '7 a 12x', '13 a 18x', '19 a 24x', '25x ou mais']; const v = (c) => (A.pagParcelas.find((x) => x.faixa === c) || { n: 0 }).n;
    const maxP = d3.max(PB, v);
    vbars($('ch-parcelas'), PB, v, (c) => c, (c) => (v(c) === maxP ? css('--v-violet') : css('--v-indigo')), 230, 'contratos');
    legend($('leg-meio'), MEIOS.map((m) => [m, MEIO_COR[m]]));
    stacked($('ch-meio-curso'), A.cursos.map((c) => { const rs = A.pagMeioCurso.filter((x) => x.curso === c); const tot = d3.sum(rs, (x) => x.n) || 1; const b = rs.find((x) => x.meio === 'Boleto');
      return { titulo: c, total: tot, sub: `${b ? pf.format(b.n / tot) : '0,0%'} no boleto · ${nf.format(tot)} alunos`, partes: MEIOS.map((m) => ({ nome: m, n: (rs.find((x) => x.meio === m) || { n: 0 }).n, cor: MEIO_COR[m] })) }; }));
    $('tb-valor').tBodies[0].replaceChildren(...A.pagValor.map((r) => { const tr = el('tr'); tr.append(el('td', 'nome', r.curso), el('td', 'num', nf.format(r.contratos)), el('td', 'num', r.parcelasMedia == null ? '—' : nf.format(Math.round(r.parcelasMedia * 10) / 10) + 'x'),
      el('td', 'num', r.parcelaMedia == null ? '—' : brl.format(r.parcelaMedia)), el('td', 'num', brl.format(r.totalMedio))); return tr; }));
  }

  function pgComercial() {
    const sorter = sortable('tb-vend', 'pendentes', -1, pgComercial); const mx = d3.max(A.vendedores, (r) => r.taxa) || 1;
    $('tb-vend').tBodies[0].replaceChildren(...sorter(A.vendedores).map((r) => { const tr = el('tr'); tr.append(el('td', 'nome', r.vendedor), el('td', 'num', nf.format(r.total)), el('td', 'num', nf.format(r.ok)), el('td', 'num', nf.format(r.pendentes)), el('td', 'num', nf.format(r.cancelados)));
      const t = el('td', 'num'); t.appendChild(cellBar(r.taxa, mx)); tr.appendChild(t); return tr; }));
  }

  function mesesEntre(a, b) { const out = []; let [y, m] = a.split('-').map(Number); const [y2, m2] = b.split('-').map(Number); while (y < y2 || (y === y2 && m <= m2)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } } return out; }
  function pgCancelamentos() {
    hbars($('ch-motivos'), A.cancMotivo, (r) => r.motivo, (r) => r.n, (r) => (r.motivo === 'Não informado' ? css('--v-slate') : css('--v-cyan')));
    const vd = (c) => (A.cancDias.find((x) => x.faixa === c) || { n: 0 }).n;
    vbars($('ch-dias'), DIAS, vd, (c) => ({ '0-7': 'até 7 d', '8-30': '8 a 30 d', '31-90': '31 a 90 d', '91-180': '91 a 180 d', '180+': '180+ d' }[c]), (c) => (c === '8-30' || c === '31-90' ? css('--v-coral') : css('--v-slate')), 230, 'cancelamentos');
    const ms = A.cancMes.length ? mesesEntre(A.cancMes[0].mes, A.cancMes[A.cancMes.length - 1].mes) : []; const vm = (c) => (A.cancMes.find((x) => x.mes === c) || { n: 0 }).n; const mx = d3.max(ms, vm);
    vbars($('ch-cmes'), ms, vm, mesLabel, (c, v) => (v === mx ? css('--v-coral') : css('--v-indigo')), 230, 'cancelamentos');
    hbars($('ch-ccurso'), A.cancCurso, (r) => r.curso, (r) => r.n, () => css('--v-violet'));
  }

  function pgQualidade() {
    $('tb-qual').tBodies[0].replaceChildren(...A.qualidade.map((r) => { const tr = el('tr'); tr.append(el('td', 'nome', r.curso), el('td', 'num', nf.format(r.total)));
      ['emailInvalido', 'foneSuspeito', 'semPagamento'].forEach((k) => { const td = el('td', 'num', nf.format(r[k])); if (r[k] / r.total > 0.1) { td.style.color = 'var(--v-coral)'; td.style.fontWeight = 700; } else if (r[k] > 0) td.style.color = 'var(--v-orange)'; tr.appendChild(td); }); return tr; }));
    hbars($('ch-pagto'), A.formaPagamento, (r) => r.forma, (r) => r.n, (r) => MEIO_COR[r.forma]);
    $('ac-info').textContent = `${nf.format(Object.keys(acomp).length)} alunos com acompanhamento marcado neste navegador.`;
  }

  const PAGINAS = { visao: pgVisao, fila: pgFila, reversao: pgReversao, gargalos: pgGargalos, pagamentos: pgPagamentos, comercial: pgComercial, cancelamentos: pgCancelamentos, qualidade: pgQualidade };
  function desenhar() { if (!A) return; hideTip(); cabecalho(); PAGINAS[pagina](); }
  const tabs = Array.from(document.querySelectorAll('.tab'));
  function abrir(id, link) {
    if (!PAGINAS[id]) id = 'visao'; pagina = id;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.page === id)));
    document.querySelectorAll('.page').forEach((p) => { p.hidden = p.id !== id; });
    if (link) history.replaceState(null, '', '#' + id);
    desenhar();
  }
  tabs.forEach((t) => t.addEventListener('click', () => abrir(t.dataset.page, true)));
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (pagina === 'visao' || pagina === 'pagamentos' || pagina === 'cancelamentos') desenhar(); }, 150); });
  addEventListener('storage', (e) => { if (e.key === K_ACOMP) { acomp = ls.get(K_ACOMP) || {}; desenhar(); } });

  /* ---------- inicialização ---------- */
  const params = new URLSearchParams(location.search);
  if (params.has('demo')) iniciar(R.gerarDemo(U.hojeISO()), { arquivo: 'dados de exemplo', carregadoEm: new Date().toISOString(), demo: true }, false);
  else { const salvo = ls.get(K_DADOS); if (salvo && salvo.bruto && salvo.bruto.matriculas) iniciar(salvo.bruto, { ...salvo.meta, demo: false }, false); }
})();
