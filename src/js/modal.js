/**
 * Código responsável pelo modal (tela que aparece por cima de tudo para
 * avisar ou perguntar algo ao usuário).
 */

/* Cria o modal se já não tiver criado */
import {hideItem, showItem} from "/src/js/utils";

if (!document.getElementById("modalOverlay")) {
    const modalHTML = `
        <div id="modalOverlay" class="modal-overlay" style="display: none;">
            <div class="modal-content">
                <h3 id="modalTitulo">titulo</h3>
                <p id="modalMensagem">mensagem</p>
    
                <div class="modal-botoes">
                    <select id="modalSelectElement" style="display: none;">
                    </select>
                </div>
                
                <div class="modal-botoes">
                    <input type="number" id="modalNumberElement" style="display: none">
                </div>
                
                <p id="modalInvalidValueMessage" class="soft-warn startHidden" style="color: orange;">Insira algo válido!</p> <!-- esse texto não é o final! -->
    
                <div class="modal-botoes">
                    <!-- Os textos dos botões abaixo não afetam o botão em si, são só exemplos. -->
                    <button id="modalBtnOk" class="alternative">Confirmar</button>
                    <button id="modalBtnCancelar" class="danger">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    // Injeta o modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}


// Referências para os elementos de modal
const Modal = {
    Overlay: document.getElementById('modalOverlay'),
    Titulo: document.getElementById('modalTitulo'),
    Mensagem: document.getElementById('modalMensagem'),

    ValorInvalidoMensagem: document.getElementById("modalInvalidValueMessage"),

    BtnOk: document.getElementById('modalBtnOk'),
    BtnCancelar: document.getElementById('modalBtnCancelar'),

    SelectElement: document.getElementById('modalSelectElement'),
    NumberElement: document.getElementById("modalNumberElement")
}

// As entradas(como Sim/Não) que o modal aceita.
export const EntradasModal = Object.freeze({
    SIM_OU_NAO: 'sim_ou_nao',
    OK: 'ok',
    SELECAO: 'selecao',
    NUMERO: 'numero'
    // Lembre-se: se adicionar mais tipos de entrada aqui,
    // adicione o tratamento deles na função `abrirModal` e
    // documente a entrada no comentário da função.
})

/**
 * Função para exibir o modal e aguardar a resposta do usuário.
 * Os tipos de entrada são:
 * - `EntradasModal.SIM_OU_NAO`: O modal terá botões "Confirmar" (retorna true) e "Cancelar" (retorna false).
 * - `EntradasModal.OK`: O modal terá apenas o botão "Ok" (retorna true).
 * - `EntradasModal.SELECAO`: O modal terá um menu de seleção (dropdown) com as opções dadas no campo `opcoes` das opções dadas.
 *   (objeto onde a chave é o valor retornado e o valor é o texto mostrado). O botão "Ok" retorna o valor
 *   selecionado, e "Cancelar" retorna null.
 * - `EntradasModal.NUMERO`: O modal terá um campo de entrada numérica. O botão "Ok" retorna o número inserido (como número, não string), e "Cancelar" retorna null.
 *   É possível delimitar o número mínimo e máximo aceito usando as opções `minNumber` e `maxNumber`, respectivamente.
 *
 * Opções gerais:
 * - BtnOkTexto: texto do botão "Ok"
 *
 * NOTA: Em geral, **lembre-se** de verificar se **o resultado é null** (caso em que o usuário cancela, exceto na entrada de Sim/Não).
 * @param {string} titulo O título da caixinha
 * @param {string} mensagem O texto descritivo
 * @param {string} tipoDeEntrada tipo de entrada que o modal deve aceitar.
 * @param {{}} opcoes opções a respeito da entrada. Cada tipo de entrada **pode** ter opções específicas.
 * @returns {Promise} Retorna uma promise com o valor que o usuário colocou. Se o usuário cancelou, retorna null
 */
export function abrirModal(titulo, mensagem, tipoDeEntrada, opcoes = {}) {
    let opcoesPadroes = {
        BtnOkTexto: "Confirmar",
        BtnCancelarTexto: "Cancelar",
        ValorInvalidoMensagem: "Insira um valor válido para confirmar.",

        // Entrada do botão OK
        BtnOkTextoEntradaOk: "Ok",

        // Entrada do botão SIM no SIM_OU_NÃO
        BtnOkTextoEntradaSimOuNao: "Sim",
        BtnCancelarTextoEntradaSimOuNao: "Não",

        // Entrada de Número
        minNumber: "",  // número mínimo
        maxNumber: "",   // número máximo
    };

    // Une as opções dadas com as padrões
    opcoes = { ...opcoesPadroes, ...opcoes };

    return new Promise((resolve) => {
        // Preenche os textos
        Modal.Titulo.innerHTML = titulo;
        Modal.Mensagem.innerHTML = mensagem;
        Modal.ValorInvalidoMensagem.innerHTML = opcoes.ValorInvalidoMensagem;

        // Esconde todas as entradas (por padrão)
        hideItem(Modal.SelectElement);
        hideItem(Modal.NumberElement)
        hideItem(Modal.BtnCancelar);
        hideItem(Modal.BtnOk);

        // Coloca as propriedades padrões
        Modal.BtnOk.innerText = opcoes.BtnOkTexto;
        Modal.BtnCancelar.innerText = opcoes.BtnCancelarTexto;
        Modal.SelectElement.innerHTML = ""; // Limpa opções anteriores
        Modal.NumberElement.value = ""; // Limpa valor anterior

        // Coloca o OK e Cancelar como padrão (vão aparecer quase todas as vezes)
        showItem(Modal.BtnOk);
        showItem(Modal.BtnCancelar);

        // Mostra/esconde e altera os textos das entradas
        switch (tipoDeEntrada) {
            case EntradasModal.SIM_OU_NAO:
                Modal.BtnOk.innerText = opcoes.BtnOkTextoEntradaSimOuNao;
                Modal.BtnCancelar.innerText = opcoes.BtnCancelarTextoEntradaSimOuNao;
                break;

            case EntradasModal.OK:
                hideItem(Modal.BtnCancelar);
                Modal.BtnOk.innerText = opcoes.BtnOkTextoEntradaOk;
                break;

            case EntradasModal.SELECAO:
                showItem(Modal.SelectElement);
                // Verifica se tem opções
                if (!opcoes.opcoes) throw new Error("Tipo de entrada 'SELECAO' requer a opção 'opcoes' (array de objetos com 'valor' e 'texto').");
                // Preenche as opções de seleção
                Object.keys(opcoes.opcoes).forEach(valor => {
                    const optionElement = document.createElement("option");
                    optionElement.value = valor;
                    optionElement.text = opcoes.opcoes[valor];
                    Modal.SelectElement.appendChild(optionElement);
                });
                break;

            case EntradasModal.NUMERO:
                showItem(Modal.NumberElement);
                // Define os limites
                Modal.NumberElement.min = opcoes.minNumber;
                Modal.NumberElement.max = opcoes.maxNumber;
                break;
        }

        showItem(Modal);

        // Evento para quando clicar no botão Ok.
        // NOTA: Usar .onclick sobrescreve o evento anterior automaticamente,
        // evitando bugs de cliques acumulados.
        Modal.BtnOk.onclick = () => {
            hideItem(Modal.ValorInvalidoMensagem);

            let success = true;

            switch (tipoDeEntrada) {
                case EntradasModal.SELECAO:
                    const valorSelecionado = Modal.SelectElement.value;
                    resolve(valorSelecionado);
                    break;

                case EntradasModal.NUMERO:
                    const valorNumerico = parseFloat(Modal.NumberElement.value);
                    if (isNaN(valorNumerico)) {
                        success = false;
                        break;
                    } else if ( (opcoes.minNumber !== '' && valorNumerico < Modal.NumberElement.min) || (opcoes.maxNumber !== '' && valorNumerico > Modal.NumberElement.max) ) {
                        success = false;
                        break;
                    }

                    // Se chegou até aqui, é um número válido.
                    resolve(valorNumerico)
                    break;

                default: // Resolve a Promise como verdadeira
                    resolve(true);
            }

            if (success) fecharModal();
            else {
                showItem(Modal.ValorInvalidoMensagem);
            }
        };

        // Evento para quando clicar no botão Cancelar.
        Modal.BtnCancelar.onclick = () => {
            fecharModal();
            switch (tipoDeEntrada) {
                case EntradasModal.SIM_OU_NAO:
                    resolve(false);
                    break;

                default:
                    resolve(null);
            }
            resolve(null); // Resolve a Promise como nada
        };

        // Mostra o modal
        Modal.Overlay.style.display = 'flex';
    });
}

/**
 * Cria um aviso para o usuário, com apenas um botão de "Entendi" para fechar.
 * Retorna uma Promise que é resolvida quando o usuário clicar em "Entendi".
 * @param {String} mensagem A mensagem do aviso. Pode ser um texto simples ou conter HTML (como links).
 * @return {Promise} Promise que é resolvida quando o usuário clicar em "Entendi".
 */
export function abrirAviso(mensagem) {
    return abrirModal("Aviso", mensagem, EntradasModal.OK, { BtnOkTextoEntradaOk: "Entendi" });
}

/**
 * Cria um modal de confirmação para o usuário, com um botão para continuar e outro para sair.
 * Retorna uma Promise (contendo o resultado) que é resolvida quando o usuário clicar em algum dos botões.
 * @param {String} mensagem A mensagem do aviso. Pode ser um texto simples ou conter HTML (como links).
 * @return {Promise<Boolean>} Promise contendo o resultado que é resolvida quando o usuário clicar em dos botões
 */
export function abrirConfirmacao(mensagem) {
    return abrirModal("Atenção!", mensagem, EntradasModal.SIM_OU_NAO);
}

function fecharModal() {
    Modal.Overlay.style.display = 'none';
}