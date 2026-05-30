const API = 'http://localhost:3000'
const token = localStorage.getItem('token')
const headers = { 'Authorization': `Bearer ${token}` }

// ── Redireciona se não tiver token ───────────────────────────────────────────
if (!token) {
  window.location.href = 'login.html'
}

// ── Referências aos elementos ────────────────────────────────────────────────
const selMes       = document.getElementById('sel-mes')
const selAno       = document.getElementById('sel-ano')
const btnFiltrar   = document.getElementById('btn-filtrar')
const periodoLabel = document.getElementById('periodo-label')
const cardFat      = document.getElementById('card-faturamento')
const cardTotal    = document.getElementById('card-total-vendas')
const cardTicket   = document.getElementById('card-ticket-medio')
const tbody        = document.getElementById('tbody-fat')
const tabelaTitulo = document.getElementById('tabela-titulo')

// ── Data de hoje no cabeçalho ────────────────────────────────────────────────
const dataHoje = new Date()
document.getElementById('data-hoje').textContent = dataHoje.toLocaleDateString('pt-BR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
})

// ── Preenche o select de anos (3 anos atrás até ano atual) ───────────────────
const anoAtual = dataHoje.getFullYear()
for (let a = anoAtual; a >= anoAtual - 3; a--) {
  const opt = document.createElement('option')
  opt.value = a
  opt.textContent = a
  selAno.appendChild(opt)
}

// ── Seleciona mês e ano atuais por padrão ────────────────────────────────────
selMes.value = dataHoje.getMonth() + 1
selAno.value = anoAtual

// ── Nomes dos meses para exibição ───────────────────────────────────────────
const MESES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

// ── Formata valor monetário ──────────────────────────────────────────────────
function formatarReais(valor) {
  return 'R$ ' + parseFloat(valor || 0).toFixed(2).replace('.', ',')
}

// ── Formata data ─────────────────────────────────────────────────────────────
function formatarData(dataStr) {
  return new Date(dataStr).toLocaleDateString('pt-BR')
}

// ── Badge de status ──────────────────────────────────────────────────────────
const statusLabel = {
  pendente: 'Pendente',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  entregue: 'Entregue'
}

function badgeStatus(status) {
  const label = statusLabel[status] || status
  return `<span class="badge badge-${status}">${label}</span>`
}

// ── Resumo dos itens de uma venda (ex: "Blusa, Chapéu") ──────────────────────
function resumoItens(itens) {
  if (!itens || itens.length === 0) return '—'
  const nomes = itens.map(i => i.nome_produto).filter(Boolean)
  if (nomes.length === 0) return '—'
  if (nomes.length === 1) return nomes[0]
  return nomes[0] + ` +${nomes.length - 1}`
}

// ── Carrega e renderiza o faturamento do período ─────────────────────────────
async function carregarFaturamento() {
  const mes = parseInt(selMes.value)
  const ano = parseInt(selAno.value)
  const nomeMes = MESES[mes]

  periodoLabel.textContent = `${nomeMes} de ${ano}`
  tabelaTitulo.textContent = `Vendas de ${nomeMes}/${ano}`

  // Loading nos cards
  cardFat.textContent    = 'R$ ...'
  cardTotal.textContent  = '...'
  cardTicket.textContent = 'R$ ...'
  tbody.innerHTML = `<tr><td colspan="8" class="tabela-loading">Carregando...</td></tr>`

  try {
    const res = await fetch(`${API}/vendas`, { headers })

    if (res.status === 401) {
      window.location.href = 'login.html'
      return
    }

    const todasVendas = await res.json()

    // Filtra vendas do mês/ano selecionado no frontend
    const vendas = todasVendas.filter(v => {
      const d = new Date(v.data_venda)
      return d.getMonth() + 1 === mes && d.getFullYear() === ano
    })

    // ── Calcula os cards ────────────────────────────────────────────────────
    const totalVendas    = vendas.length
    const faturamentoTotal = vendas.reduce((acc, v) => acc + parseFloat(v.valor_total || 0), 0)
    const ticketMedio    = totalVendas > 0 ? faturamentoTotal / totalVendas : 0

    cardFat.textContent    = formatarReais(faturamentoTotal)
    cardTotal.textContent  = totalVendas
    cardTicket.textContent = formatarReais(ticketMedio)

    // ── Renderiza tabela ────────────────────────────────────────────────────
    if (vendas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="tabela-vazia">Nenhuma venda em ${nomeMes}/${ano}.</td></tr>`
      return
    }

    tbody.innerHTML = vendas.map(v => {
      const desconto   = parseFloat(v.desconto || 0)
      const descontoTxt = desconto > 0 ? formatarReais(desconto) : '—'
      const osNum      = String(v.id).padStart(4, '0')

      return `
        <tr>
          <td><strong>#${osNum}</strong></td>
          <td>${v.cliente || '—'}</td>
          <td style="color:var(--texto-suave);font-size:0.82rem">${resumoItens(v.itens)}</td>
          <td style="color:var(--alerta)">${descontoTxt}</td>
          <td><strong>${formatarReais(v.valor_total)}</strong></td>
          <td>${badgeStatus(v.status_encomenda)}</td>
          <td style="color:var(--texto-suave)">${formatarData(v.data_venda)}</td>
          <td>
            <a class="link-os" href="os.html?id=${v.id}" target="_blank">Ver OS</a>
          </td>
        </tr>
      `
    }).join('')

  } catch (erro) {
    console.error('Erro ao carregar faturamento:', erro)
    tbody.innerHTML = `<tr><td colspan="8" class="tabela-vazia">Erro ao carregar dados. Verifique se o servidor está rodando.</td></tr>`
    cardFat.textContent    = 'R$ —'
    cardTotal.textContent  = '—'
    cardTicket.textContent = 'R$ —'
  }
}

// ── Evento do botão filtrar ──────────────────────────────────────────────────
btnFiltrar.addEventListener('click', carregarFaturamento)

// ── Carrega ao abrir a página ────────────────────────────────────────────────
carregarFaturamento()