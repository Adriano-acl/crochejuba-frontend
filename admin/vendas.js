const token = localStorage.getItem('token')
if (!token) { alert('Faça login primeiro'); window.location.href = 'login.html' }

const API = 'https://crochejuba-sistema-production.up.railway.app'
const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

const agora = new Date()
document.getElementById('data-hoje').textContent = agora.toLocaleDateString('pt-BR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
})

let vendas = []
let clientes = []
let produtos = []
let editandoId = null

// ===== CARREGAR DADOS =====

async function carregarClientes() {
  const res = await fetch(`${API}/clientes`, { headers })
  clientes = await res.json()
  const sel = document.getElementById('campo-cliente')
  sel.innerHTML = '<option value="">Selecione o cliente...</option>'
  clientes.forEach(c => {
    sel.innerHTML += `<option value="${c.id}">${c.nome}</option>`
  })
}

async function carregarProdutos() {
  const res = await fetch(`${API}/produtos`, { headers })
  produtos = await res.json()
}

async function carregarVendas() {
  const res = await fetch(`${API}/vendas`, { headers })
  vendas = await res.json()
  renderTabela(vendas)
}

// ===== TABELA =====

function renderTabela(lista) {
  const tbody = document.getElementById('tbody-vendas')
  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="tabela-loading">Nenhuma venda encontrada</td></tr>'
    return
  }

  const badgeStatus = {
    pendente:    '<span class="badge-status badge-pendente">Pendente</span>',
    em_producao: '<span class="badge-status badge-producao">Em produção</span>',
    pronto:      '<span class="badge-status badge-pronto">Pronto</span>',
    entregue:    '<span class="badge-status badge-entregue">Entregue</span>',
  }

  tbody.innerHTML = lista.map(v => {
    const data = new Date(v.data_venda).toLocaleDateString('pt-BR')
    const total = parseFloat(v.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const desconto = parseFloat(v.desconto || 0)
    const descontoTexto = desconto > 0
      ? desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—'
    const badge = badgeStatus[v.status_encomenda] || badgeStatus.pendente

    // Resumo dos itens: "Bolsa (2), Chapéu (1)"
    const itensResumo = v.itens && v.itens.length > 0
      ? v.itens.map(i => `${i.nome_produto} (${i.quantidade})`).join(', ')
      : '—'

    return `
      <tr>
        <td><strong>#${String(v.id).padStart(4, '0')}</strong></td>
        <td>${v.cliente || '—'}</td>
        <td style="font-size:0.82rem; color:var(--texto-suave)">${itensResumo}</td>
        <td>${descontoTexto}</td>
        <td class="td-valor">${total}</td>
        <td>${badge}</td>
        <td>${data}</td>
        <td class="acoes">
          <button class="btn-editar" onclick="abrirEdicao(${v.id})">Editar</button>
          <button class="btn-excluir" onclick="excluir(${v.id})">Excluir</button>
          <button class="btn-os" onclick="abrirOS(${v.id})">🖨 OS</button>
        </td>
      </tr>
    `
  }).join('')
}

// ===== BUSCA =====

document.getElementById('busca-os').addEventListener('input', function () {
  const termo = this.value.toLowerCase()
  const filtrado = vendas.filter(v =>
    String(v.id).padStart(4, '0').includes(termo) ||
    (v.cliente && v.cliente.toLowerCase().includes(termo))
  )
  renderTabela(filtrado)
})

// ===== ITENS DINÂMICOS =====

function criarLinhaItem(item = {}) {
  const div = document.createElement('div')
  div.className = 'item-linha'

  // Montar options do select de produtos
  const options = produtos.map(p =>
    `<option value="${p.id}" data-preco="${p.preco}" ${item.produto_id == p.id ? 'selected' : ''}>
      ${p.nome}
    </option>`
  ).join('')

  div.innerHTML = `
    <select class="form-input sel-produto">
      <option value="">Selecione o produto...</option>
      <option value="outro" ${!item.produto_id ? 'selected' : ''}>Outro (sob medida)</option>
      ${options}
    </select>
    <input type="number" class="form-input inp-qtd" min="1" value="${item.quantidade || 1}" placeholder="1">
    <input type="number" class="form-input inp-valor" min="0" step="0.01" value="${item.valor_unitario || ''}" placeholder="0,00">
    <input type="text" class="form-input inp-subtotal" readonly placeholder="R$ 0,00" style="background:#faf9f7; cursor:default">
    <button class="btn-remover-item" title="Remover">✕</button>
  `

  const selProduto = div.querySelector('.sel-produto')
  const inpQtd     = div.querySelector('.inp-qtd')
  const inpValor   = div.querySelector('.inp-valor')
  const inpSub     = div.querySelector('.inp-subtotal')
  const btnRemover = div.querySelector('.btn-remover-item')

  // Preencher nome se for "outro"
  if (!item.produto_id && item.nome_produto) {
    // adiciona campo de nome livre se for sob medida
    inserirCampoNome(div, item.nome_produto)
  }

  // Ao selecionar produto, preenche o preço automaticamente
  selProduto.addEventListener('change', () => {
    const opt = selProduto.options[selProduto.selectedIndex]
    const preco = parseFloat(opt.dataset.preco)

    // Mostrar/esconder campo nome livre
    const campoNomeExistente = div.querySelector('.inp-nome-livre')
    if (selProduto.value === 'outro') {
      if (!campoNomeExistente) inserirCampoNome(div)
      inpValor.value = ''
    } else {
      if (campoNomeExistente) campoNomeExistente.remove()
      if (!isNaN(preco)) inpValor.value = preco.toFixed(2)
    }
    calcularSubtotal()
    atualizarResumo()
  })

  inpQtd.addEventListener('input', () => { calcularSubtotal(); atualizarResumo() })
  inpValor.addEventListener('input', () => { calcularSubtotal(); atualizarResumo() })

  btnRemover.addEventListener('click', () => {
    div.remove()
    atualizarResumo()
  })

  function calcularSubtotal() {
    const qtd = parseFloat(inpQtd.value) || 0
    const val = parseFloat(inpValor.value) || 0
    const sub = qtd * val
    inpSub.value = sub.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Calcular subtotal inicial se vier com dados
  if (item.valor_unitario && item.quantidade) calcularSubtotal()

  return div
}

function inserirCampoNome(div, valorInicial = '') {
  const inp = document.createElement('input')
  inp.type = 'text'
  inp.className = 'form-input inp-nome-livre'
  inp.placeholder = 'Nome do produto (ex: Vestido sob medida)'
  inp.value = valorInicial
  inp.style.gridColumn = '1 / -1'
  inp.style.marginTop = '4px'
  // Insere antes do botão remover
  div.insertBefore(inp, div.querySelector('.btn-remover-item'))
}

document.getElementById('btn-adicionar-item').addEventListener('click', () => {
  const lista = document.getElementById('itens-lista')
  lista.appendChild(criarLinhaItem())
  atualizarResumo()
})

function atualizarResumo() {
  const linhas = document.querySelectorAll('#itens-lista .item-linha')
  let subtotal = 0
  linhas.forEach(linha => {
    const qtd = parseFloat(linha.querySelector('.inp-qtd').value) || 0
    const val = parseFloat(linha.querySelector('.inp-valor').value) || 0
    subtotal += qtd * val
  })

  const desconto = parseFloat(document.getElementById('campo-desconto').value) || 0
  const total = Math.max(0, subtotal - desconto)

  document.getElementById('resumo-subtotal').textContent =
    subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  document.getElementById('resumo-total').textContent =
    total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

document.getElementById('campo-desconto').addEventListener('input', atualizarResumo)

// ===== ABRIR FORMULÁRIO =====

document.getElementById('btn-nova-venda').addEventListener('click', () => {
  editandoId = null
  document.getElementById('form-titulo').textContent = 'Nova Venda'
  document.getElementById('campo-cliente').value = ''
  document.getElementById('campo-status').value = 'pendente'
  document.getElementById('campo-obs').value = ''
  document.getElementById('campo-desconto').value = '0'
  document.getElementById('itens-lista').innerHTML = ''
  document.getElementById('resumo-subtotal').textContent = 'R$ 0,00'
  document.getElementById('resumo-total').textContent = 'R$ 0,00'

  // Começa com uma linha de item vazia
  document.getElementById('itens-lista').appendChild(criarLinhaItem())

  document.getElementById('form-box').style.display = 'block'
  document.getElementById('form-box').scrollIntoView({ behavior: 'smooth' })
})

document.getElementById('btn-fechar-form').addEventListener('click', fecharForm)
document.getElementById('btn-cancelar').addEventListener('click', fecharForm)

function fecharForm() {
  document.getElementById('form-box').style.display = 'none'
  editandoId = null
}

// ===== EDIÇÃO =====

async function abrirEdicao(id) {
  const v = vendas.find(x => x.id === id)
  if (!v) return
  editandoId = id

  document.getElementById('form-titulo').textContent = `Editando OS #${String(id).padStart(4, '0')}`

  const clienteObj = clientes.find(c => c.nome === v.cliente)
  document.getElementById('campo-cliente').value = clienteObj ? clienteObj.id : ''
  document.getElementById('campo-status').value = v.status_encomenda || 'pendente'
  document.getElementById('campo-obs').value = v.observacao || ''
  document.getElementById('campo-desconto').value = parseFloat(v.desconto || 0).toFixed(2)

  // Carregar itens
  const lista = document.getElementById('itens-lista')
  lista.innerHTML = ''

  // Buscar itens da venda no servidor
  try {
    const res = await fetch(`${API}/vendas/${id}/itens`, { headers })
    const itens = await res.json()
    itens.forEach(item => lista.appendChild(criarLinhaItem(item)))
  } catch {
    // Se falhar, usa os itens que já vieram no GET /vendas
    if (v.itens && v.itens.length > 0) {
      v.itens.forEach(item => lista.appendChild(criarLinhaItem(item)))
    }
  }

  atualizarResumo()
  document.getElementById('form-box').style.display = 'block'
  document.getElementById('form-box').scrollIntoView({ behavior: 'smooth' })
}

// ===== SALVAR =====

document.getElementById('btn-salvar').addEventListener('click', async () => {
  const cliente_id = document.getElementById('campo-cliente').value
  const status_encomenda = document.getElementById('campo-status').value
  const observacao = document.getElementById('campo-obs').value
  const desconto = parseFloat(document.getElementById('campo-desconto').value) || 0

  if (!cliente_id) { alert('Selecione um cliente!'); return }

  // Coletar itens
  const linhas = document.querySelectorAll('#itens-lista .item-linha')
  const itens = []

  for (const linha of linhas) {
    const selProduto  = linha.querySelector('.sel-produto')
    const qtd         = parseInt(linha.querySelector('.inp-qtd').value)
    const valor       = parseFloat(linha.querySelector('.inp-valor').value)
    const nomelivre   = linha.querySelector('.inp-nome-livre')

    let produto_id   = selProduto.value === 'outro' || selProduto.value === '' ? null : parseInt(selProduto.value)
    let nome_produto = ''

    if (produto_id) {
      nome_produto = selProduto.options[selProduto.selectedIndex].text.trim()
    } else {
      nome_produto = nomelivre ? nomelivre.value.trim() : ''
    }

    if (!nome_produto) { alert('Preencha o nome do produto em todos os itens!'); return }
    if (!qtd || qtd < 1) { alert('Quantidade inválida em um dos itens!'); return }
    if (!valor || valor <= 0) { alert('Valor inválido em um dos itens!'); return }

    itens.push({ produto_id, nome_produto, quantidade: qtd, valor_unitario: valor })
  }

  if (itens.length === 0) { alert('Adicione pelo menos um item!'); return }

  const body = { cliente_id: parseInt(cliente_id), itens, desconto, observacao, status_encomenda }

  try {
    if (editandoId) {
      const subtotal = itens.reduce((a, i) => a + i.valor_unitario * i.quantidade, 0)
      const valor_total = Math.max(0, subtotal - desconto)
      body.valor_total = valor_total

      const res = await fetch(`${API}/vendas/${editandoId}`, { method: 'PUT', headers, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(await res.text())
      alert('Venda atualizada!')
    } else {
      const res = await fetch(`${API}/vendas`, { method: 'POST', headers, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(await res.text())
      const dados = await res.json()
      alert(`Venda registrada! OS #${String(dados.id).padStart(4, '0')}`)
    }
    fecharForm()
    carregarVendas()
  } catch (erro) {
    alert('Erro: ' + erro.message)
  }
})

// ===== EXCLUIR =====

async function excluir(id) {
  if (!confirm(`Excluir OS #${String(id).padStart(4, '0')}?`)) return
  const res = await fetch(`${API}/vendas/${id}`, { method: 'DELETE', headers })
  if (res.ok) { carregarVendas() } else { alert('Erro ao excluir') }
}

// ===== ABRIR OS =====

function abrirOS(id) {
  window.open(`os.html?id=${id}`, '_blank')
}

// ===== INICIALIZAR =====

carregarClientes()
carregarProdutos()
carregarVendas()

// Se veio do dashboard com ?nova=true, abre o formulário automaticamente
if (new URLSearchParams(window.location.search).get('nova') === 'true') {
  document.getElementById('btn-nova-venda').click()
}