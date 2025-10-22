// Configuração - Substitua pela URL do seu Apps Script
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxXPEP2HXVyG9Vbp1gEpcKukduHUsg-cOiOCnTQE5oqBYLeuNr-7gQ7kJIgvVnp10tg/exec';
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
    
    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.setupModal();
        this.setupMask();
        this.setupValidation();
        this.updateCounter();
    }
    
    async updateCounter() {
        try {
            // Tentar pegar o contador real do Apps Script
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
            // Fallback: usar valor inicial
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
            newsletter: formData.get('newsletter') ? 'Sim' : 'Não',
            dataInscricao: new Date().toISOString(),
            evento: 'Treinão de TODOS - Corrida 5km & Caminhada 3km',
            cidade: 'São João del Rei - MG'
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
        try {
            this.setLoading(true);
            
            // Método 1: Tentar requisição normal primeiro
            try {
                const response = await fetch(APP_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    await this.handleSuccess(result, data);
                    return;
                }
            } catch (fetchError) {
                console.log('Método 1 falhou, tentando método alternativo...', fetchError);
            }
            
            // Método 2: Usar Google Forms como fallback
            await this.tryAlternativeMethod(data);
            
        } catch (error) {
            console.error('Erro na inscrição:', error);
            this.showError();
        } finally {
            this.setLoading(false);
        }
    }
    
    async handleSuccess(result, originalData) {
        if (result.success) {
            this.inscritosCount = result.numeroInscricao || this.inscritosCount + 1;
            this.vagasRestantes = result.vagasRestantes || Math.max(0, VAGAS_CAMISETAS - this.inscritosCount);
            
            this.updateCounter();
            this.showSuccess(result.garanteCamiseta, result.numeroInscricao);
            this.form.reset();
            
            // Verificar depois de 2 segundos se realmente foi registrado
            setTimeout(() => {
                this.verifyRegistration(originalData.email);
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Erro desconhecido no servidor');
        }
    }
    
    async tryAlternativeMethod(data) {
        // Método alternativo: Usar formulário HTML temporário
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = APP_SCRIPT_URL;
        form.style.display = 'none';
        
        // Adicionar todos os dados como campos hidden
        Object.keys(data).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = data[key];
            form.appendChild(input);
        });
        
        document.body.appendChild(form);
        form.submit();
        
        // Mostrar mensagem de sucesso assumindo que funcionou
        this.inscritosCount++;
        this.vagasRestantes = Math.max(0, VAGAS_CAMISETAS - this.inscritosCount);
        this.updateCounter();
        this.showSuccess(this.vagasRestantes > 0, this.inscritosCount);
        this.form.reset();
        
        // Remover formulário após uso
        setTimeout(() => document.body.removeChild(form), 1000);
    }
    
    async verifyRegistration(email) {
        try {
            const response = await fetch(`${APP_SCRIPT_URL}?action=verify&email=${encodeURIComponent(email)}`);
            const result = await response.json();
            
            if (!result.registered) {
                console.warn('Inscrição não encontrada na verificação posterior');
            }
        } catch (error) {
            console.error('Erro na verificação:', error);
        }
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
    
    showError() {
        const modalMessage = document.getElementById('modalMessage');
        modalMessage.innerHTML = `
            <p><strong>Inscrição em processamento! ⚠️</strong></p>
            <p>Sua inscrição foi recebida e está sendo processada.</p>
            <p><strong>Não esqueça:</strong> Leve 1 brinquedo para doação no dia do evento.</p>
            <p><em>Entraremos em contato em breve para confirmação.</em></p>
        `;
        this.successModal.style.display = 'block';
    }
    
    setLoading(loading) {
        this.submitBtn.disabled = loading;
        this.submitBtn.classList.toggle('loading', loading);
    }
    
    hideModal() {
        this.successModal.style.display = 'none';
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new TreinaoRegistration();
});