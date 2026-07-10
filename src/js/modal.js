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
                
                <div class="modal-botoes">
                    <input type="text" id="modalTextElement" style="display: none">
                </div>
                
                <!-- Caso haja necessidade para outro input de texto -->
                <div class="modal-botoes" style="flex-direction: column; align-items: center; gap: 5px;">
                    <p id="modalTextElement2Label" style="margin: 0;"></p>
                    <input type="text" id="modalTextElement2" style="display: none">
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
    NumberElement: document.getElementById("modalNumberElement"),
    TextElement: document.getElementById("modalTextElement"),
    TextElement2: document.getElementById("modalTextElement2"),
    TextElement2Label: document.getElementById("modalTextElement2Label")
}

// As entradas(como Sim/Não) que o modal aceita.
export const EntradasModal = Object.freeze({
    SIM_OU_NAO: 'sim_ou_nao',
    OK: 'ok',
    SELECAO: 'selecao',
    NUMERO: 'numero',
    TEXTO: 'texto',
    TEXTO2: 'texto2'
    // Lembre-se: se adicionar mais tipos de entrada aqui,
    // adicione o tratamento deles na função `abrirModal`
    // (como fazer a limpeza deles toda vez que um modal é
    // aberto) e documente a entrada no comentário da função.
})

const FILA_MODAIS = []; // fila de modais para evitar que mais de um modal seja aberto ao mesmo tempo

// Se o modal está atualmente aberto
let modalEstaAberto = false;

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
 * - `EntradasModal.TEXTO`: O modal terá uma pequena caixa de texto. O botão "OK" retorna o texto escrito e "Cancelar" retorna null
 * - `EntradasModal.TEXTO2`: O modal terá duas pequenas caixas de texto. O botão "OK" retorna os textos escritos em um array e "Cancelar" retorna null
 *
 * Opções gerais:
 * - BtnOkTexto: texto do botão "Ok"
 *
 * NOTA: Em geral, **lembre-se** de verificar se **o resultado é null** (caso em que o usuário cancela, exceto na entrada de Sim/Não).
 * @param {string} titulo O título da caixinha
 * @param {string} mensagem O texto descritivo
 * @param {string} tipoDeEntrada tipo de entrada que o modal deve aceitar.
 * @param {{}} opcoes opções a respeito da entrada. Cada tipo de entrada **pode** ter opções específicas.
 * @returns {Promise<Any>} Retorna uma promise com o valor que o usuário colocou. Se o usuário cancelou, retorna null
 */
export function abrirModal(titulo, mensagem, tipoDeEntrada, opcoes = {}) {
    if (modalEstaAberto) {
        return new Promise((resolve) => {
            // Adiciona na fila para abrir depois
            FILA_MODAIS.push({
                titulo: titulo,
                mensagem: mensagem,
                tipoDeEntrada: tipoDeEntrada,
                opcoes: opcoes,
                promise: resolve
            });
        });
    }
    modalEstaAberto = true;

    const fila_promise = opcoes && opcoes.FilaPromise;
    let opcoesPadroes = {
        BtnOkTexto: "Confirmar",
        BtnCancelarTexto: "Cancelar",
        ValorInvalidoMensagem: "Insira um valor válido para confirmar.",
        FilaPromise: null,

        // Entrada do botão OK
        BtnOkTextoEntradaOk: "Ok",

        // Entrada do botão SIM no SIM_OU_NÃO
        BtnOkTextoEntradaSimOuNao: "Sim",
        BtnCancelarTextoEntradaSimOuNao: "Não",

        // Entrada de Número
        minNumber: "",  // número mínimo
        maxNumber: "",   // número máximo

        // Entrada de Texto
        textPlaceholder: "", // o texto que aparece por padrão no texto 1 (a caixa normal)
        text2Placeholder: "", // o texto que aparece por padrão no texto 2
        text2Label: "" // a label para o texto 2
    };

    // Une as opções dadas com as padrões
    opcoes = { ...opcoesPadroes, ...opcoes };

    return new Promise((resolve) => {
        function _resolver(...args) {
            resolve(...args);
            if (fila_promise) fila_promise(...args);
        }
        // Preenche os textos
        Modal.Titulo.innerHTML = titulo;
        Modal.Mensagem.innerHTML = mensagem;
        Modal.ValorInvalidoMensagem.innerHTML = opcoes.ValorInvalidoMensagem;

        // Esconde todas as entradas (por padrão)
        hideItem(Modal.SelectElement);
        hideItem(Modal.NumberElement)
        hideItem(Modal.TextElement);
        hideItem(Modal.TextElement2Label);
        hideItem(Modal.TextElement2);
        hideItem(Modal.BtnCancelar);
        hideItem(Modal.BtnOk);

        // Coloca as propriedades padrões (limpa os elementos)
        Modal.BtnOk.innerText = opcoes.BtnOkTexto;
        Modal.BtnCancelar.innerText = opcoes.BtnCancelarTexto;
        Modal.SelectElement.innerHTML = "";
        Modal.NumberElement.value = "";
        Modal.TextElement.value = "";
        Modal.TextElement2Label.innerText = "";
        Modal.TextElement2.value = "";

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

            case EntradasModal.TEXTO:
                showItem(Modal.TextElement);
                Modal.TextElement.value = opcoes.textPlaceholder;
                break;

            case EntradasModal.TEXTO2:
                showItem(Modal.TextElement);
                showItem(Modal.TextElement2);
                showItem(Modal.TextElement2Label);
                Modal.TextElement.value = opcoes.textPlaceholder;
                Modal.TextElement2.value = opcoes.text2Placeholder;
                Modal.TextElement2Label.innerText = opcoes.text2Label;
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
                    _resolver(valorSelecionado);
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
                    _resolver(valorNumerico)
                    break;

                case EntradasModal.TEXTO:
                    _resolver(Modal.TextElement.value);
                    break;

                case EntradasModal.TEXTO2:
                    _resolver([Modal.TextElement.value, Modal.TextElement2.value]);
                    break;

                default: // Resolve a Promise como verdadeira
                    _resolver(true);
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
                    _resolver(false);
                    break;

                default:
                    _resolver(null);
            }
            _resolver(null); // Resolve a Promise como nada
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
 * Cria um alerta para um usuário, com apenas um botão de "Ok" para fechar.
 * Retorna uma Promise que é resolvida quando o usuário clicar em "Ok".
 * @param mensagem a mensagem que será mostrada ao usuário.
 * @return {Promise} Promise que é resolvida quando o usuário clicar em "Ok".
 */
export function abrirAlerta(mensagem) {
    return abrirModal("", mensagem, EntradasModal.OK);
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
    modalEstaAberto = false;
    if (FILA_MODAIS.length > 0) {
        const proximoModal = FILA_MODAIS.shift();
        abrirModal(proximoModal.titulo, proximoModal.mensagem, proximoModal.tipoDeEntrada, { ...proximoModal.opcoes, FilaPromise: proximoModal.promise }).then( );
    }
}