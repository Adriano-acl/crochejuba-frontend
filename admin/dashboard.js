// ===== 1. VERIFICAR LOGIN =====
const token = localStorage.getItem('token')
const nomeUsuario = localStorage.getItem('nomeUsuario')

if (!token) {
  alert('Faça login primeiro')
  window.location.href = 'login.html'
}

// ===== 2. DATA DE HOJE =====
const dataEl = document.getElementById('data-hoje')
const agora = new Date()
const opcoes = { month: 'long', year: 'numeric' }
dataEl.textContent = agora.toLocaleDateString('pt-BR', opcoes)

// Saudação pelo horário
const hora = agora.getHours()
let saudacao = 'Bom dia'
if (hora >= 12 && hora < 18) saudacao = 'Boa tarde'
if (hora >= 18) saudacao = 'Boa noite'

const nomeEl = document.querySelector('.page-saudacao')
nomeEl.textContent = `${saudacao}, Juba 👋`

// ===== 3. CONFIGURAÇÃO DAS REQUISIÇÕES =====
const API = 'http://localhost:3000'
const headers = { 'Authorization': `Bearer ${token}` }

// ===== 4. BUSCAR VENDAS DO MÊS =====
async function carregarVendas() {
  try {
    const res = await fetch(`${API}/vendas`, { headers })
    const vendas = await res.json()

    // Filtrar só as vendas do mês atual
    const mesAtual = agora.getMonth()
    const anoAtual = agora.getFullYear()

    const vendasMes = vendas.filter(v => {
      const data = new Date(v.data_venda)
      return data.getMonth() === mesAtual && data.getFullYear() === anoAtual
    })

    // Calcular faturamento
    const faturamento = vendasMes.reduce((total, v) => total + parseFloat(v.valor_total), 0)

    // Preencher cards
    document.getElementById('faturamento').textContent =
      faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      document.querySelector('.card-detalhe.positivo').textContent =
  `↑ ${vendasMes.length} venda${vendasMes.length !== 1 ? 's' : ''} este mês`

    document.getElementById('vendas-mes').textContent = vendasMes.length

    // Preencher tabela com as 5 últimas vendas
    const ultimas = vendas.slice(-5).reverse()
    const tbody = document.getElementById('tbody-vendas')

    if (ultimas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="tabela-loading">Nenhuma venda registrada</td></tr>'
      return
    }

    tbody.innerHTML = ultimas.map(v => {
      const data = new Date(v.data_venda).toLocaleDateString('pt-BR')
      const valor = parseFloat(v.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      return `
        <tr>
          <td>${v.cliente || '—'}</td>
          <td>${v.produto || '—'}</td>
          <td>${data}</td>
          <td class="td-valor">${valor}</td>
        </tr>
      `
    }).join('')

  } catch (erro) {
    console.log('Erro ao carregar vendas:', erro)
  }
}

// ===== 5. BUSCAR CLIENTES =====
async function carregarClientes() {
  try {
    const res = await fetch(`${API}/clientes`, { headers })
    const clientes = await res.json()
    document.getElementById('total-clientes').textContent = clientes.length

    // Clientes cadastrados este mês
    const mesAtual = agora.getMonth()
    const anoAtual = agora.getFullYear()
    const novos = clientes.filter(c => {
      const data = new Date(c.criado_em)
      return data.getMonth() === mesAtual && data.getFullYear() === anoAtual
    })
    document.getElementById('clientes-novos').textContent =
      `${novos.length} novos este mês`

  } catch (erro) {
    console.log('Erro ao carregar clientes:', erro)
  }
}

// ===== 6. BUSCAR ESTOQUE BAIXO =====
async function carregarEstoque() {
  try {
    const res = await fetch(`${API}/produtos`, { headers })
    const produtos = await res.json()

    const baixo = produtos.filter(p => p.quantidade <= 1)
    document.getElementById('estoque-baixo').textContent = baixo.length

    if (baixo.length > 0) {
      const nomes = baixo.map(p => p.nome).join(' e ')
      document.getElementById('alerta-texto').textContent =
        `${nomes} está com estoque baixo (${baixo.length === 1 ? '1 unidade' : 'poucos itens'}). Considere repor.`
      document.getElementById('alerta-estoque').style.display = 'flex'
    }

  } catch (erro) {
    console.log('Erro ao carregar estoque:', erro)
  }
}

// ===== RODAR TUDO =====
carregarVendas()
carregarClientes()
carregarEstoque()