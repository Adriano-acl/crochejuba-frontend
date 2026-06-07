// ===== 1. VERIFICAR LOGIN =====
const token = localStorage.getItem('token')
if (!token) {
  alert('Faça login primeiro')
  window.location.href = 'login.html'
}

const API = 'https://crochejuba-sistema-production.up.railway.app'
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}

// ===== 2. ESTADO INTERNO =====
let modoEdicao = false
let idEditando = null

// ===== 3. REFERÊNCIAS DO DOM =====
const formBox       = document.getElementById('form-box')
const formTitulo    = document.getElementById('form-titulo')
const btnNovo       = document.getElementById('btn-novo-produto')
const btnFechar     = document.getElementById('btn-fechar')
const btnCancelar   = document.getElementById('btn-cancelar')
const btnSalvar     = document.getElementById('btn-salvar')
const campoNome     = document.getElementById('campo-nome')
const campoPreco    = document.getElementById('campo-preco')
const campoQtd      = document.getElementById('campo-quantidade')
const campoDesc     = document.getElementById('campo-descricao')
const tbodyProdutos = document.getElementById('tbody-produtos')
const totalEl       = document.getElementById('total-produtos')

// ===== 4. ABRIR / FECHAR FORMULÁRIO =====
function abrirFormulario() {
  formBox.style.display = 'block'
  campoNome.focus()
}

function fecharFormulario() {
  formBox.style.display = 'none'
  limparFormulario()
  modoEdicao = false
  idEditando = null
  formTitulo.textContent = 'Novo Produto'
  btnSalvar.textContent = 'Salvar produto'
}

function limparFormulario() {
  campoNome.value = ''
  campoPreco.value = ''
  campoQtd.value = ''
  campoDesc.value = ''
}

btnNovo.addEventListener('click', abrirFormulario)
btnFechar.addEventListener('click', fecharFormulario)
btnCancelar.addEventListener('click', fecharFormulario)

// ===== 5. CARREGAR PRODUTOS =====
async function carregarProdutos() {
  try {
    const res = await fetch(`${API}/produtos`, { headers })
    const produtos = await res.json()

    totalEl.textContent = `${produtos.length} produto${produtos.length !== 1 ? 's' : ''} cadastrado${produtos.length !== 1 ? 's' : ''}`

    // Alerta de estoque baixo
    const baixo = produtos.filter(p => p.quantidade <= 1)
    if (baixo.length > 0) {
      const nomes = baixo.map(p => p.nome).join(', ')
      document.getElementById('alerta-texto').textContent =
        `Estoque baixo: ${nomes}. Considere repor.`
      document.getElementById('alerta-estoque').style.display = 'flex'
    } else {
      document.getElementById('alerta-estoque').style.display = 'none'
    }

    if (produtos.length === 0) {
      tbodyProdutos.innerHTML = '<tr><td colspan="5" class="tabela-loading">Nenhum produto cadastrado ainda</td></tr>'
      return
    }

    tbodyProdutos.innerHTML = produtos.map(p => {
      const preco = parseFloat(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      const badgeEstoque = p.quantidade <= 1
        ? `<span class="badge-alerta">${p.quantidade}</span>`
        : `<span class="badge-ok">${p.quantidade}</span>`

      return `
        <tr>
          <td><strong>${p.nome}</strong></td>
          <td class="td-descricao">${p.descricao || '—'}</td>
          <td class="td-valor">${preco}</td>
          <td>${badgeEstoque}</td>
          <td>
            <div class="acoes">
              <button class="btn-editar" onclick="prepararEdicao(${p.id}, '${escapar(p.nome)}', ${p.preco}, ${p.quantidade}, '${escapar(p.descricao || '')}')">Editar</button>
              <button class="btn-excluir" onclick="excluirProduto(${p.id}, '${escapar(p.nome)}')">Excluir</button>
            </div>
          </td>
        </tr>
      `
    }).join('')

  } catch (erro) {
    console.log('Erro ao carregar produtos:', erro)
    tbodyProdutos.innerHTML = '<tr><td colspan="5" class="tabela-loading">Erro ao carregar produtos</td></tr>'
  }
}

// Escapa aspas simples para não quebrar o onclick
function escapar(texto) {
  return String(texto).replace(/'/g, "\\'")
}

// ===== 6. CADASTRAR / EDITAR =====
btnSalvar.addEventListener('click', async () => {
  const nome      = campoNome.value.trim()
  const preco     = campoPreco.value.trim()
  const quantidade = campoQtd.value.trim()
  const descricao = campoDesc.value.trim()

  if (!nome || !preco || quantidade === '') {
    alert('Preencha nome, preço e quantidade.')
    return
  }

  const corpo = { nome, descricao, preco: parseFloat(preco), quantidade: parseInt(quantidade) }

  try {
    if (modoEdicao) {
      // PUT — atualizar
      const res = await fetch(`${API}/produtos/${idEditando}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(corpo)
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
    } else {
      // POST — cadastrar
      const res = await fetch(`${API}/produtos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(corpo)
      })
      if (!res.ok) throw new Error('Erro ao cadastrar')
    }

    fecharFormulario()
    carregarProdutos()

  } catch (erro) {
    console.log('Erro ao salvar produto:', erro)
    alert('Erro ao salvar. Verifique se o servidor está rodando.')
  }
})

// ===== 7. PREPARAR EDIÇÃO =====
function prepararEdicao(id, nome, preco, quantidade, descricao) {
  modoEdicao = true
  idEditando = id
  formTitulo.textContent = 'Editar Produto'
  btnSalvar.textContent = 'Salvar alterações'

  campoNome.value = nome
  campoPreco.value = preco
  campoQtd.value = quantidade
  campoDesc.value = descricao

  abrirFormulario()
}

// ===== 8. EXCLUIR =====
async function excluirProduto(id, nome) {
  const confirmar = confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)
  if (!confirmar) return

  try {
    const res = await fetch(`${API}/produtos/${id}`, {
      method: 'DELETE',
      headers
    })
    if (!res.ok) throw new Error('Erro ao excluir')
    carregarProdutos()

  } catch (erro) {
    console.log('Erro ao excluir produto:', erro)
    alert('Erro ao excluir. Verifique se o servidor está rodando.')
  }
}

// ===== INICIAR =====
carregarProdutos()