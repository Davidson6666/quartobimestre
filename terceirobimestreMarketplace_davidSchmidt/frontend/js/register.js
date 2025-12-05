// Lógica da página de registro
document.addEventListener('DOMContentLoaded', () => {
    // Redirecionar se já estiver autenticado
    if (auth.isAuthenticated()) {
        auth.redirectToDashboard();
        return;
    }

    const registerForm = document.getElementById('registerForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const buyerTypeBtn = document.getElementById('buyerTypeBtn');
    const sellerTypeBtn = document.getElementById('sellerTypeBtn');
    const accountTypeInput = document.getElementById('accountType');
    const siglaGroup = document.getElementById('siglaGroup');

    // Verificar se há parâmetro de tipo na URL
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    
    if (typeParam === 'seller') {
        selectAccountType('seller');
    } else if (typeParam === 'buyer') {
        selectAccountType('buyer');
    }

    // Event listeners para seleção de tipo de conta
    buyerTypeBtn.addEventListener('click', () => {
        selectAccountType('buyer');
    });

    sellerTypeBtn.addEventListener('click', () => {
        selectAccountType('seller');
    });

    // Event listener para o formulário
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Limpar mensagens anteriores
            hideMessage(errorMessage);
            hideMessage(successMessage);

            // Obter valores do formulário
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const accountTypeInput = document.getElementById('accountType');
            const accountType = accountTypeInput.value;
            const sigla = accountType === 'seller' ? document.getElementById('sigla').value.trim() : undefined;

            // Validação básica
            if (!name || !email || !password || !confirmPassword) {
                showMessage(errorMessage, 'Por favor, preencha todos os campos.');
                return;
            }

            if (password.length < 6) {
                showMessage(errorMessage, 'A senha deve ter pelo menos 6 caracteres.');
                return;
            }

            if (password !== confirmPassword) {
                showMessage(errorMessage, 'As senhas não coincidem.');
                return;
            }

            // Validação extra no frontend (opcional)
            if (accountType === 'seller' && (!sigla || !/^[a-zA-Z]+$/.test(sigla))) {
                showMessage(errorMessage, 'A sigla deve conter apenas letras e não pode estar vazia.');
                return;
            }

            // Desabilitar botão durante o envio
            submitBtn.disabled = true;
            submitBtn.textContent = 'Criando conta...';

            try {
                // Preparar dados do usuário
                const userData = {
                    nome: name,
                    email: email,
                    senha: password,
                    role: accountType,
                    tipo: accountType === 'seller' ? 'vendedor' : 'comprador',
                    ...(accountType === 'seller' ? { sigla } : {})
                };

                // Fazer registro
                const result = await auth.register(userData);

                if (result.success) {
                    showMessage(successMessage, 'Conta criada com sucesso! Redirecionando...');
                    
                    // Redirecionar após 1 segundo
                    setTimeout(() => {
                        window.location.href = "../index.html";
                    }, 1000);
                } else {
                    showMessage(errorMessage, result.error || 'Erro ao criar conta. Tente novamente.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Criar Conta';
                }
            } catch (error) {
                console.error('Erro no registro:', error);
                showMessage(errorMessage, 'Erro ao criar conta. Tente novamente mais tarde.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Criar Conta';
            }
        });
    }
});

// Selecionar tipo de conta
function selectAccountType(type) {
    const buyerTypeBtn = document.getElementById('buyerTypeBtn');
    const sellerTypeBtn = document.getElementById('sellerTypeBtn');
    const accountTypeInput = document.getElementById('accountType');
    const siglaGroup = document.getElementById('siglaGroup');

    if (type === 'buyer') {
        buyerTypeBtn.classList.add('active');
        sellerTypeBtn.classList.remove('active');
        accountTypeInput.value = 'buyer';
        siglaGroup.style.display = 'none';
    } else {
        sellerTypeBtn.classList.add('active');
        buyerTypeBtn.classList.remove('active');
        accountTypeInput.value = 'seller';
        siglaGroup.style.display = 'block';
    }
}

// Mostrar mensagem
function showMessage(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

// Esconder mensagem
function hideMessage(element) {
    element.style.display = 'none';
    element.textContent = '';
}
