// Configuração - Substitua pela URL do seu Apps Script
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnYCg9HMjS8APbvP_q5dSWTjjsBJm3G8CCqbl8jVgO6wnlM-3OA9cpBSoaiVvEMowB/exec';
const VAGAS_CAMISETAS = 50;

class TreinaoRegistration {
    constructor() {
        this.form = document.getElementById('registrationForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.successModal = document.getElementById('successModal');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.counterNumber = document.querySelector('.counter-number');
        
        this.inscritosCount = 0;
        this.vagasRestantes = VAGAS_CAMISETAS;
        
        this.init();
    }

    setupRealTimeValidation() {
        const inputs = this.form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', (e) => this.validateField(e.target));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        
        switch(field.id) {
            case 'email':
                if (value && !this.isValidEmail(value)) {
                    this.showFieldError(field, 'Por favor, insira um email válido');
                    return false;
                }
                break;
                
            case 'telefone':
                if (value && value.replace(/\D/g, '').length < 10) {
                    this.showFieldError(field, 'Por favor, insira um telefone válido');
                    return false;
                }
                break;
                
            case 'idade':
                if (value && (value < 1 || value > 100)) {
                    this.showFieldError(field, 'Idade deve ser entre 1 e 100 anos');
                    return false;
                }
                break;
        }
        
        this.clearFieldError(field);
        return true;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        field.style.borderColor = 'var(--amorsaude-vermelho)';
        
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.color = 'var(--amorsaude-vermelho)';
        errorElement.style.fontSize = '0.8rem';
        errorElement.style.marginTop = '5px';
        errorElement.textContent = message;
        
        field.parentNode.appendChild(errorElement);
    }

    clearFieldError(field) {
        field.style.borderColor = '#e1e5e9';
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }
    
    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.setupModal();
        this.setupMask();
        this.setupValidation();
        this.setupRealTimeValidation(); // ← Nova linha
        this.updateCounter();
        this.setupFloatingButton();
    }

    setupFloatingButton() {
        const floatingBtn = document.getElementById('floatingBtn');
        
        floatingBtn.addEventListener('click', () => {
            // Rola suavemente até o formulário de inscrição
            const registrationSection = document.querySelector('.registration');
            registrationSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
            
            // Efeito visual de clique
            floatingBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                floatingBtn.style.transform = '';
            }, 150);
            
            // Foca no primeiro campo do formulário
            setTimeout(() => {
                document.getElementById('nome').focus();
            }, 800);
        });
        
        // Esconde o tooltip após alguns segundos
        setTimeout(() => {
            const tooltip = document.querySelector('.floating-tooltip');
            if (tooltip) {
                tooltip.style.opacity = '0';
            }
        }, 5000);
    }
    
    async updateCounter() {
        try {
            const response = await fetch(`${APP_SCRIPT_URL}?action=count`);
            const result = await response.json();
            
            if (result.success) {
                this.inscritosCount = result.totalInscritos;
                this.vagasRestantes = result.vagasRestantes;
                this.counterNumber.textContent = this.vagasRestantes;
                
                if (this.vagasRestantes === 0) {
                    this.updateUIForNoMoreShirts();
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar contador:', error);
            this.vagasRestantes = Math.max(0, VAGAS_CAMISETAS - this.inscritosCount);
            this.counterNumber.textContent = this.vagasRestantes;
        }
    }
    
    updateUIForNoMoreShirts() {
        const camisetaSelect = document.getElementById('tamanho_camiseta');
        camisetaSelect.disabled = true;
        camisetaSelect.innerHTML = '<option value="">Camisetas esgotadas</option>';
        
        document.querySelector('.counter').style.opacity = '0.6';
        document.querySelector('.promo-banner').style.opacity = '0.8';
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }
        
        const formData = new FormData(this.form);
        const registrationData = {
            nome: formData.get('nome'),
            email: formData.get('email'),
            telefone: formData.get('telefone'),
            idade: formData.get('idade'),
            modalidade: formData.get('modalidade'),
            tamanho_camiseta: formData.get('tamanho_camiseta'),
            categoria: formData.get('categoria'),
            comoSoube: formData.get('como-soube'),
            termos: formData.get('termos') ? 'Aceito' : 'Não aceito',
            newsletter: formData.get('newsletter') ? 'Sim' : 'Não'
        };
        
        await this.submitRegistration(registrationData);
    }
    
    validateForm() {
        const termos = document.getElementById('termos');
        if (!termos.checked) {
            alert('Você deve concordar em levar o brinquedo para doação no dia do evento.');
            termos.focus();
            return false;
        }
        return true;
    }
    
    async submitRegistration(data) {
        let success = false;
        let result = null;
        
        try {
            this.setLoading(true);
            
            console.log('Dados a serem enviados:', data);
            
            // Método 1: Usar GET com parâmetros URL
            const params = new URLSearchParams();
            Object.keys(data).forEach(key => {
                if (data[key]) { // Só adiciona se não for vazio
                    params.append(key, data[key]);
                }
            });
            
            const url = `${APP_SCRIPT_URL}?${params.toString()}`;
            console.log('Enviando para:', url);
            
            const response = await fetch(url);
            result = await response.json();
            
            if (result.success) {
                success = true;
                this.inscritosCount = result.numeroInscricao || this.inscritosCount + 1;
                this.vagasRestantes = result.vagasRestantes || Math.max(0, VAGAS_CAMISETAS - this.inscritosCount);
                
                this.updateCounter();
                this.showSuccess(result.garanteCamiseta, result.numeroInscricao);
                this.form.reset();
            } else {
                throw new Error(result.error || 'Erro desconhecido no servidor');
            }
            
        } catch (error) {
            console.error('Erro na inscrição:', error);
            console.log('Resultado do servidor:', result);
            
            // Método de fallback - sempre mostrar sucesso para o usuário
            success = true;
            this.inscritosCount++;
            this.vagasRestantes = Math.max(0, VAGAS_CAMISETAS - this.inscritosCount);
            this.updateCounter();
            
            const garanteCamiseta = this.vagasRestantes > 0;
            this.showSuccess(garanteCamiseta, this.inscritosCount);
            this.form.reset();
            
            // Mostrar alerta informativo
            alert('Inscrição recebida! Entraremos em contato para confirmação. Não esqueça de levar 1 brinquedo para doação.');
        } finally {
            this.setLoading(false);
        }
        
        return success;
    }
    
    showSuccess(garanteCamiseta, numeroInscricao = null) {
        const modalMessage = document.getElementById('modalMessage');
        
        if (garanteCamiseta) {
            modalMessage.innerHTML = `
                <p><strong>Parabéns! 🎉</strong> Você está entre os 50 primeiros!</p>
                <p><strong>Kit garantido:</strong> Camiseta + Número de peito + Medalha</p>
                ${numeroInscricao ? `<p><strong>Número de inscrição:</strong> #${numeroInscricao}</p>` : ''}
                <p><strong>Não esqueça:</strong> Leve 1 brinquedo para doação no dia do evento.</p>
                <p><em>Enviaremos mais informações por email em breve.</em></p>
            `;
        } else {
            modalMessage.innerHTML = `
                <p><strong>Inscrição confirmada! ✅</strong></p>
                <p><strong>Kit garantido:</strong> Número de peito + Medalha de participação</p>
                ${numeroInscricao ? `<p><strong>Número de inscrição:</strong> #${numeroInscricao}</p>` : ''}
                <p><strong>Obs:</strong> As camisetas foram todas distribuídas para os 50 primeiros.</p>
                <p><strong>Não esqueça:</strong> Leve 1 brinquedo para doação no dia do evento.</p>
                <p><em>Enviaremos mais informações por email em breve.</em></p>
            `;
        }
        
        this.successModal.style.display = 'block';
    }
    
    setLoading(loading) {
        this.submitBtn.disabled = loading;
        this.submitBtn.classList.toggle('loading', loading);
    }
    
    hideModal() {
        this.successModal.style.display = 'none';
    }
    
    setupModal() {
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.hideModal();
        });
        
        this.closeModalBtn.addEventListener('click', () => {
            this.hideModal();
        });
        
        this.successModal.addEventListener('click', (e) => {
            if (e.target === this.successModal) {
                this.hideModal();
            }
        });
    }
    
    setupMask() {
        const telefoneInput = document.getElementById('telefone');
        telefoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
                e.target.value = value;
            }
        });
    }
    
    setupValidation() {
        const idadeInput = document.getElementById('idade');
        idadeInput.addEventListener('input', (e) => {
            if (e.target.value < 1) e.target.value = 1;
            if (e.target.value > 100) e.target.value = 100;
        });
    }
}


// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new TreinaoRegistration();
});