// Lógica da página de login
document.addEventListener('DOMContentLoaded', () => {
    // Redirecionar se já estiver autenticado
    if (auth.isAuthenticated()) {
        auth.redirectToDashboard();
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // Event listener para o formulário
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpar mensagens anteriores
        hideMessage(errorMessage);
        hideMessage(successMessage);

        // Obter valores do formulário
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validação básica
        if (!email || !password) {
            showMessage(errorMessage, 'Por favor, preencha todos os campos.');
            return;
        }

        // Desabilitar botão durante o envio
        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';

        try {
            // Fazer login
            const result = await auth.login(email, password);

            if (result.success) {
                showMessage(successMessage, 'Login realizado com sucesso! Redirecionando...');
                
                // Redirecionar após 1 segundo
                setTimeout(() => {
                    auth.redirectToDashboard();
                }, 1000);
            } else {
                showMessage(errorMessage, result.error || 'Erro ao fazer login. Verifique suas credenciais.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar';
            }
        } catch (error) {
            console.error('Erro no login:', error);
            showMessage(errorMessage, 'Erro ao fazer login. Tente novamente mais tarde.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
        }
    });
});

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
