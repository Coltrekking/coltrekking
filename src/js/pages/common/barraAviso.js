/**
 * Funções ligadas à barra de aviso (ao topo do site).
 * Ao importar esse código, a barra de aviso é, automaticamente,
 * colocada no topo do site.
 *
 * @author André Dias
 * @since 2024-07
 */

// Cria a barra de aviso
import {onValue} from "firebase/database";
import {refFromDatabase} from "/src/js/utils";

// Referência para o aviso
// Obs.: não usei a constante `GeralDatabaseRef` aqui porque ela ainda não foi carregada
const AvisoDatabaseRef = refFromDatabase('geral/aviso');

if (!document.getElementById("barraAviso")) {
    const barraHTML = `
        <div id="barraAviso" class="forceHidden">
            <!-- Conteúdo do aviso -->
            <div class="conteudo-aviso flex-center">
                <img id="barraAvisoIcone" src="/assets/icons/warning-icon.svg" alt="Ícone do status do aviso" class="status-icon">
                <div class="flex-center">
                    <p id="barraAvisoMensagem" class="google-font">Mensagem aleatória grande o suficiente para ser um caso absurdamente extremo do uso dessa ferramenta no site.</p>
                </div>
            </div>
        </div>
    `;

    // Injeta a barra
    document.body.insertAdjacentHTML('beforebegin', barraHTML);
}

const barraAviso = document.getElementById('barraAviso');
const barraAvisoIcone = document.getElementById('barraAvisoIcone');
const barraAvisoMensagem = document.getElementById('barraAvisoMensagem');

export const TIPO_AVISO = Object.freeze({
    NOTIFICACAO: 'notificacao',
    ERRO: 'erro',
    // Lembre-se: se adicionar mais tipos de aviso aqui,
    // adicione o tratamento deles na função `showAviso`
    // (como fazer a limpeza deles toda vez que um modal é
    // aberto) e documente a aviso no comentário da função.
})

// Função para obter o ícone que representa o tipo do aviso
const getIconeDoTipoAviso = (tipo) => {
    switch (tipo) {
        case TIPO_AVISO.NOTIFICACAO: return '/assets/icons/warning-icon.svg';
        case TIPO_AVISO.ERRO: return '/assets/icons/error-icon.svg';

        default: return '/assets/icons/question-mark-icon.svg'
    }
}

/**
 * Mostra a barra de aviso (no topo do site) com a mensagem e o tipo dado.
 * @param {String} texto texto que será mostrado
 * @param {String} tipo tipo do aviso (vai definir o ícone que vai aparecer na barra)
 */
export function showAviso(texto, tipo) {
    // Remove (se tiver) a classe que força estar escondido
    barraAviso.classList.remove('forceHidden');

    barraAvisoMensagem.textContent = texto;
    barraAvisoIcone.src = getIconeDoTipoAviso(tipo);
}

/**
 * Faz a barra de aviso desaparecer
 */
export function hideAviso() {
    // Adicione a classe que força estar escondido
    barraAviso.classList.add('forceHidden');
    // Retira o texto
    barraAvisoMensagem.textContent = "";
    barraAvisoIcone.src = getIconeDoTipoAviso("dsadasdsa");
}

/**
 * Sempre que o aviso é atualizado, essa função é chamada.
 */
function onAvisoAtualizado(snapshot) {
    // Se a snapshot não existe, retira a barra
    if (!snapshot.exists()) {
        hideAviso();
        return;
    }

    const val = snapshot.val();
    const mensagem = val.mensagem;
    const tipo = val.tipo.trim();

    // Se não há mensagem, não há aviso. Logo, retira a barra
    if (!mensagem || mensagem.trim() === "") {
        hideAviso();
        return;
    }

    // Mostra o aviso
    showAviso(mensagem, tipo);
}


// Quando o Aviso for atualizado, chama a respectiva função
onValue(AvisoDatabaseRef, onAvisoAtualizado);