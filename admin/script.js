const botaoLogin = document.getElementById('btnLogin')

botaoLogin.addEventListener('click', async () => {

    const email = document.getElementById('email').value
    const senha = document.getElementById('senha').value

    if (!email || !senha) {
        alert('Preencha email e senha')
        return
    }

    try {

       const resposta = await fetch('https://crochejuba-sistema-production.up.railway.app/login', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                email,
                senha
            })

        })

        if (!resposta.ok) {
            alert('Email ou senha inválidos')
            return
        }

        const dados = await resposta.json()

        // salva token
        localStorage.setItem('token', dados.token)

        // salva nome do usuário
        localStorage.setItem('usuario', dados.nome)

        alert('Login realizado com sucesso!')

        // redireciona
        window.location.href = 'dashboard.html'

    } catch (erro) {

        console.log(erro)

        alert('Erro ao conectar com o servidor')

    }

})