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
let todosClientes = []

// ===== 3. REFERÊNCIAS DO DOM =====
const formBox        = document.getElementById('form-box')
const formTitulo     = document.getElementById('form-titulo')
const btnNovo        = document.getElementById('btn-novo-cliente')
const btnFechar      = document.getElementById('btn-fechar')
const btnCancelar    = document.getElementById('btn-cancelar')
const btnSalvar      = document.getElementById('btn-salvar')
const btnBuscar      = document.getElementById('btn-buscar')
const btnLimparBusca = document.getElementById('btn-limpar-busca')
const campoBusca     = document.getElementById('campo-busca')
const tbodyClientes  = document.getElementById('tbody-clientes')
const totalEl        = document.getElementById('total-clientes')
const painelDetalhes = document.getElementById('painel-detalhes')

// ===== 4. MÁSCARA DE TELEFONE =====
// Formata para (31) 99999-9999 enquanto o usuário digita
const campoTelefone = document.getElementById('campo-telefone')
campoTelefone.addEventListener('input', () => {
  let v = campoTelefone.value.replace(/\D/g, '') // remove tudo que não é número
  if (v.length > 11) v = v.slice(0, 11)

  if (v.length <= 2) {
    campoTelefone.value = v.length ? `(${v}` : ''
  } else if (v.length <= 7) {
    campoTelefone.value = `(${v.slice(0,2)}) ${v.slice(2)}`
  } else {
    campoTelefone.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
  }
})

// Remove máscara para comparar só os dígitos na busca
function somenteNumeros(texto) {
  return String(texto).replace(/\D/g, '')
}

// ===== 5. ABRIR / FECHAR FORMULÁRIO =====
function abrirFormulario() {
  painelDetalhes.style.display = 'none' // fecha detalhes se estiver aberto
  formBox.style.display = 'block'
  document.getElementById('campo-nome').focus()
}

function fecharFormulario() {
  formBox.style.display = 'none'
  limparFormulario()
  modoEdicao = false
  idEditando = null
  formTitulo.textContent = 'Novo Cliente'
  btnSalvar.textContent = 'Salvar cliente'
}

function limparFormulario() {
  ['campo-nome','campo-telefone','campo-instagram','campo-email','campo-cpf',
   'campo-cep','campo-endereco','campo-numero','campo-complemento',
   'campo-cidade','campo-estado','campo-observacao'].forEach(id => {
    document.getElementById(id).value = ''
  })
  document.getElementById('campo-status').value = 'lead'
  document.getElementById('campo-como-chegou').value = ''
  document.getElementById('campo-interesse').value = ''
}

btnNovo.addEventListener('click', abrirFormulario)
btnFechar.addEventListener('click', fecharFormulario)
btnCancelar.addEventListener('click', fecharFormulario)

// ===== 6. BUSCA =====
// Compara só os dígitos — não importa se digitou com ou sem máscara
btnBuscar.addEventListener('click', () => {
  const termo = campoBusca.value.trim().toLowerCase()
  if (!termo) return

  const termoNumeros = somenteNumeros(termo)

  const filtrados = todosClientes.filter(c => {
    const nomeMatch = c.nome.toLowerCase().includes(termo)
    const telMatch  = termoNumeros && somenteNumeros(c.telefone || '').includes(termoNumeros)
    return nomeMatch || telMatch
  })

  renderizarTabela(filtrados)
  painelDetalhes.style.display = 'none'
})

btnLimparBusca.addEventListener('click', () => {
  campoBusca.value = ''
  renderizarTabela(todosClientes)
  painelDetalhes.style.display = 'none'
})

campoBusca.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnBuscar.click()
})

// ===== 7. CARREGAR CLIENTES =====
async function carregarClientes() {
  try {
    const res = await fetch(`${API}/clientes`, { headers })
    todosClientes = await res.json()

    totalEl.textContent = `${todosClientes.length} cliente${todosClientes.length !== 1 ? 's' : ''} cadastrado${todosClientes.length !== 1 ? 's' : ''}`
    renderizarTabela(todosClientes)

  } catch (erro) {
    console.log('Erro ao carregar clientes:', erro)
    tbodyClientes.innerHTML = '<tr><td colspan="7" class="tabela-loading">Erro ao carregar clientes</td></tr>'
  }
}

// ===== 8. RENDERIZAR TABELA =====
function renderizarTabela(clientes) {
  if (clientes.length === 0) {
    tbodyClientes.innerHTML = '<tr><td colspan="7" class="tabela-loading">Nenhum cliente encontrado</td></tr>'
    return
  }

  const badgeStatus = {
    cliente: '<span class="badge-ok">Cliente</span>',
    lead:    '<span class="badge-lead">Lead</span>',
    inativo: '<span class="badge-inativo">Inativo</span>'
  }

  const labelInteresse = {
    biquini: 'Biquíni', vestido: 'Vestido', bolsa: 'Bolsa',
    chapeu: 'Chapéu', acessorio: 'Acessório', outro: 'Outro'
  }

  tbodyClientes.innerHTML = clientes.map(c => {
    const status    = badgeStatus[c.status_cliente] || badgeStatus['lead']
    const interesse = labelInteresse[c.interesse] || '—'
    const instagram = c.instagram
      ? `<a class="link-instagram" href="https://instagram.com/${c.instagram.replace('@','')}" target="_blank">${c.instagram}</a>`
      : '—'

    return `
      <tr>
        <td><strong>${c.nome}</strong></td>
        <td>${c.telefone || '—'}</td>
        <td>${instagram}</td>
        <td>${interesse}</td>
        <td>${status}</td>
        <td>
          <div class="acoes">
            <button class="btn-ver" onclick="verDetalhes(${c.id})">Ver</button>
            <button class="btn-editar" onclick="prepararEdicao(${c.id})">Editar</button>
            <button class="btn-excluir" onclick="excluirCliente(${c.id}, '${escapar(c.nome)}')">Excluir</button>
          </div>
        </td>
      </tr>
    `
  }).join('')
}

// ===== 9. PAINEL DE DETALHES =====
function verDetalhes(id) {
  const c = todosClientes.find(c => c.id === id)
  if (!c) return

  fecharFormulario() // fecha o formulário se estiver aberto

  const labelInteresse = {
    biquini: 'Biquíni', vestido: 'Vestido', bolsa: 'Bolsa',
    chapeu: 'Chapéu', acessorio: 'Acessório', outro: 'Outro'
  }
  const labelComoChegou = {
    whatsapp: 'WhatsApp', instagram: 'Instagram',
    indicacao: 'Indicação', feira: 'Feira', outro: 'Outro'
  }
  const labelStatus = { cliente: 'Cliente', lead: 'Lead', inativo: 'Inativo' }

  // Monta o endereço completo numa linha só
  const partesEndereco = [c.endereco, c.numero, c.complemento].filter(Boolean).join(', ')
  const cidadeEstado   = [c.cidade, c.estado].filter(Boolean).join(' — ')
  const enderecoCompleto = [partesEndereco, c.cep, cidadeEstado].filter(Boolean).join(' | ')

  function linha(label, valor) {
    if (!valor) return ''
    return `
      <div class="detalhe-item">
        <span class="detalhe-label">${label}</span>
        <span class="detalhe-valor">${valor}</span>
      </div>`
  }

  painelDetalhes.innerHTML = `
    <div class="detalhe-header">
      <div>
        <h2 class="detalhe-nome">${c.nome}</h2>
        <span class="detalhe-status">${labelStatus[c.status_cliente] || 'Lead'}</span>
      </div>
      <div class="acoes">
        <button class="btn-editar" onclick="prepararEdicao(${c.id})">Editar</button>
        <button class="btn-fechar-detalhe" onclick="fecharDetalhes()">✕</button>
      </div>
    </div>

    <div class="detalhe-grid">
      <div class="detalhe-secao">
        <p class="form-secao">Contato</p>
        ${linha('Telefone', c.telefone)}
        ${linha('Instagram', c.instagram)}
        ${linha('Email', c.email)}
        ${linha('CPF', c.cpf)}
      </div>

      <div class="detalhe-secao">
        <p class="form-secao">Endereço</p>
        ${enderecoCompleto ? linha('Endereço', enderecoCompleto) : '<p class="detalhe-vazio">Não informado</p>'}
      </div>

      <div class="detalhe-secao">
        <p class="form-secao">Interesse e origem</p>
        ${linha('Interesse', labelInteresse[c.interesse])}
        ${linha('Como chegou', labelComoChegou[c.como_chegou])}
        ${linha('Observações', c.observacao)}
      </div>
    </div>
  `

  painelDetalhes.style.display = 'block'
  painelDetalhes.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function fecharDetalhes() {
  painelDetalhes.style.display = 'none'
}

// ===== 10. SALVAR (cadastrar ou editar) =====
btnSalvar.addEventListener('click', async () => {
  const nome     = document.getElementById('campo-nome').value.trim()
  const telefone = document.getElementById('campo-telefone').value.trim()

  if (!nome || !telefone) {
    alert('Nome e telefone são obrigatórios.')
    return
  }

  const corpo = {
    nome, telefone,
    cpf:            document.getElementById('campo-cpf').value.trim(),
    instagram:      document.getElementById('campo-instagram').value.trim(),
    email:          document.getElementById('campo-email').value.trim(),
    cep:            document.getElementById('campo-cep').value.trim(),
    endereco:       document.getElementById('campo-endereco').value.trim(),
    numero:         document.getElementById('campo-numero').value.trim(),
    complemento:    document.getElementById('campo-complemento').value.trim(),
    cidade:         document.getElementById('campo-cidade').value.trim(),
    estado:         document.getElementById('campo-estado').value.trim(),
    como_chegou:    document.getElementById('campo-como-chegou').value,
    interesse:      document.getElementById('campo-interesse').value,
    status_cliente: document.getElementById('campo-status').value,
    observacao:     document.getElementById('campo-observacao').value.trim()
  }

  try {
    if (modoEdicao) {
      const res = await fetch(`${API}/clientes/${idEditando}`, {
        method: 'PUT', headers, body: JSON.stringify(corpo)
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
    } else {
      const res = await fetch(`${API}/clientes`, {
        method: 'POST', headers, body: JSON.stringify(corpo)
      })
      if (!res.ok) throw new Error('Erro ao cadastrar')
    }

    fecharFormulario()
    carregarClientes()

  } catch (erro) {
    console.log('Erro ao salvar cliente:', erro)
    alert('Erro ao salvar. Verifique se o servidor está rodando.')
  }
})

// ===== 11. PREPARAR EDIÇÃO =====
function prepararEdicao(id) {
  const c = todosClientes.find(c => c.id === id)
  if (!c) return

  modoEdicao = true
  idEditando = id
  formTitulo.textContent = 'Editar Cliente'
  btnSalvar.textContent = 'Salvar alterações'

  document.getElementById('campo-nome').value        = c.nome || ''
  document.getElementById('campo-telefone').value    = c.telefone || ''
  document.getElementById('campo-instagram').value   = c.instagram || ''
  document.getElementById('campo-email').value       = c.email || ''
  document.getElementById('campo-cpf').value         = c.cpf || ''
  document.getElementById('campo-cep').value         = c.cep || ''
  document.getElementById('campo-endereco').value    = c.endereco || ''
  document.getElementById('campo-numero').value      = c.numero || ''
  document.getElementById('campo-complemento').value = c.complemento || ''
  document.getElementById('campo-cidade').value      = c.cidade || ''
  document.getElementById('campo-estado').value      = c.estado || ''
  document.getElementById('campo-como-chegou').value = c.como_chegou || ''
  document.getElementById('campo-interesse').value   = c.interesse || ''
  document.getElementById('campo-status').value      = c.status_cliente || 'lead'
  document.getElementById('campo-observacao').value  = c.observacao || ''

  abrirFormulario()
}

// ===== 12. EXCLUIR =====
async function excluirCliente(id, nome) {
  const confirmar = confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)
  if (!confirmar) return

  try {
    const res = await fetch(`${API}/clientes/${id}`, { method: 'DELETE', headers })
    if (!res.ok) throw new Error('Erro ao excluir')
    painelDetalhes.style.display = 'none'
    carregarClientes()
  } catch (erro) {
    console.log('Erro ao excluir cliente:', erro)
    alert('Erro ao excluir. Verifique se o servidor está rodando.')
  }
}

// ===== UTILITÁRIO =====
function escapar(texto) {
  return String(texto).replace(/'/g, "\\'")
}

// ===== INICIAR =====
carregarClientes()