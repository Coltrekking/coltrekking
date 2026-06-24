/**
 * Funções ligadas às instruções gerais do Coltrekking.
 *
 * @author André Dias
 * @since 2024-06
 */

import {GeralDatabaseRef, getDataFromDatabase, hideLoading, refFromDatabase, showLoading} from "/src/js/utils";
import {set, update} from "firebase/database";
import {isAdmin} from "/src/js/auth";
import {abrirAlerta, abrirModal, EntradasModal} from "/src/js/modal";
import {enviarErroParaSentry} from "/src/js/main";

// Se deve carregar a edição do menu de instrução gerais
const CARREGAR_EDICAO = window.location.href.includes("areaAdmin");

/**
 * Carrega os cartões de instrução no elemento dado
 * @param instrucoesGeraisArea área para carregar os cartões
 */
export function loadInstrucoesGerais(instrucoesGeraisArea) {
    // Obtém as instruções gerais (os cards específicos)
    getDataFromDatabase(GeralDatabaseRef, "instrucoes-gerais")
        .then(dataSnapshot => {
            const cards = [];

            // Para cada cartão, adiciona a key (nome do cartão) e o val (dados)
            dataSnapshot.forEach(card => {
                cards.push({key: card.key, val: card.val()});
            });

            // Ordena os cartões em função do índice
            cards.sort((a, b) => {
                return a.val.index - b.val.index;
            });

            // Cria um cartão visual para cada card
            cards.forEach(card => {
                createInstrucoesGeraisCard(instrucoesGeraisArea, card.key, card.val);
            });
        })
        .catch(e => {
            console.log("Erro ao obter as instruções gerais: " + e);
            enviarErroParaSentry(e);
        })
}

/**
 * Cria um card para o tipo de instrução específico dado
 * @param instrucoesGeraisArea Elemento que o card será colocado
 * @param cardName nome do card
 * @param cardData informações do card
 */
export function createInstrucoesGeraisCard(instrucoesGeraisArea, cardName, cardData, ) {
    if (!cardData) return;

    // Se não houver nada e não for admin, não mostra o card.
    // Obs.: se for admin, vai mostrar o cartão (para poder adicionar elementos)
    if (!cardData.itens && !isAdmin()) return;

    // Se não houver nada, for admin mas não estiver na página de admin, não mostra
    if (!cardData.itens && isAdmin() && !CARREGAR_EDICAO) return;

    // Cria o cartão
    const card = document.createElement("div");

    // Função que atualiza o tipo (nesse caso, visual) do card
    // Obs.: isso é usado mais para baixo nessa função, então achei
    // interessante transformar em uma função.
    function updateCardType(tipo) {
        card.className = "instrucao-card"
            + (tipo === "Alerta" ? " alerta-card" : ""); // se for alerta, adiciona a classe "alerta-card";
    }
    updateCardType(cardData.tipo);

    // Cria o título
    const titulo = document.createElement("h4");
    titulo.innerHTML = cardData.nome;

    let tipoContainer, addBtnDiv;
    if (isAdmin() && CARREGAR_EDICAO) {
        // Cria o tipo (do card) //

        const selectTipo = document.createElement("select");
        selectTipo.className = "text small-text";

        const optionNormal = document.createElement("option");
        optionNormal.innerText = "Normal";

        const optionAlerta = document.createElement("option");
        optionAlerta.innerText = "Alerta";

        selectTipo.appendChild(optionNormal);
        selectTipo.appendChild(optionAlerta);

        // Define a opção atualmente selecionada como o tipo do card
        // NOTA: certifique-se de que essa linha fica *depois* de adicionar as opções.
        selectTipo.selectedIndex = cardData.tipo === "Normal" ? 0 : 1;

        // Cria a label do tipo
        const labelTipo = document.createElement("label");
        labelTipo.innerText = "Tipo do Cartão:";

        // Quando o tipo for alterado, chama a função do evento
        selectTipo.addEventListener("input", _ => {
            let novoTipoDoCartao;
            _onInstrucaoCardTipoChanged(cardName, selectTipo.value).then(_ => {
                novoTipoDoCartao = selectTipo.value; // Se deu sucesso
            }).catch(e => {
                console.log("Erro ao alterar o tipo do card: " + e);
                novoTipoDoCartao = null; // não altera
                enviarErroParaSentry(e);
            }).finally(_ => {
                if (novoTipoDoCartao) updateCardType(novoTipoDoCartao);
            });
        });

        // Cria o botão de adicionar //

        addBtnDiv = document.createElement("div");
        addBtnDiv.className = "flex-center w100";

        const addElementoBtn = document.createElement("button");
        addElementoBtn.className = "alternative button-iconed big-text w20vw";

        const addElementoImg = document.createElement("img");
        addElementoImg.src = "/assets/icons/add-icon.svg";
        addElementoImg.className = "icon icon-on-button";

        addElementoBtn.appendChild(addElementoImg);
        // Adiciona o texto depois da imagem
        addElementoBtn.insertAdjacentText("beforeend", "Adicionar Item");

        addBtnDiv.appendChild(addElementoBtn);

        // Quando o botão for clicado, chama a função do evento
        addElementoBtn.addEventListener("click", _ => {
            _onInstrucaoCardAddItemClicked(cardName, ul);
        });

        // Cria um container para deixar alinhado
        tipoContainer = document.createElement("div");
        tipoContainer.style.display = "flex";
        tipoContainer.style.alignItems = "center";
        tipoContainer.style.gap = "8px"; // espaço entre o label e o select
        tipoContainer.style.marginBottom = "10px";

        tipoContainer.appendChild(labelTipo);
        tipoContainer.appendChild(selectTipo);
    }

    // Cria a lista
    const ul = document.createElement("ul");

    // Percorre a lista toda
    if (cardData.itens)
        for (let i = 0; i < cardData.itens.length; i++) {
            _createRowOnInstrucoesGerais(ul, cardData.itens[i], cardName);
        }

    // Adiciona os elementos
    card.appendChild(titulo);
    if (tipoContainer) card.appendChild(tipoContainer);
    card.appendChild(ul);
    if (addBtnDiv) card.appendChild(addBtnDiv);

    instrucoesGeraisArea.appendChild(card);
}

/**
 * Cria um elemento da lista de instruções gerais
 * @param ulList {Element} lista que a instrução será posta
 * @param text {String} texto da instrução
 * @param cardName {String} nome do cartão
 * @private
 */
function _createRowOnInstrucoesGerais(ulList, text, cardName) {
    // Cria o li e põe o texto
    const li = document.createElement("li");
    li.innerText = text;

    // Cria os botões de editar e remover (se for admin)
    if (isAdmin() && CARREGAR_EDICAO) {
        // Div para colocar os botões para eles permanecerem juntos
        const btnsDiv = document.createElement("div");
        btnsDiv.style.display = 'inline';
        btnsDiv.style.whiteSpace = 'nowrap'; // deixa os botões na mesma linha

        const editBtn = document.createElement("button");
        editBtn.className = "icon-button";
        editBtn.type = "button";

        const editImg = document.createElement("img");
        editImg.src = "/assets/icons/edit-icon.svg";
        editImg.alt = "Editar Texto";
        editImg.className = "edit-icon";

        editBtn.appendChild(editImg);

        // Evento para o botão de editar
        editBtn.addEventListener('click', _ => {
            _onInstrucaoCardUpdateInstrucao(li.innerText, li, cardName);
        });

        const removeBtn = document.createElement("button");
        removeBtn.className = "icon-button";
        removeBtn.type = "button";

        const removeImg = document.createElement("img");
        removeImg.src = "/assets/icons/delete-icon.svg";
        removeImg.alt = "Apagar Elemento";
        removeImg.className = "icon brightness10";

        removeBtn.appendChild(removeImg);

        removeBtn.addEventListener('click', _ => {
            _onInstrucaoCardRemoveInstrucao(cardName, ulList, text, li);
        });

        btnsDiv.appendChild(editBtn);
        btnsDiv.appendChild(removeBtn);
        li.appendChild(btnsDiv);
        //li.appendChild(editBtn);
        //li.appendChild(removeBtn);
    }

    ulList.appendChild(li);
}

/**
 * Quando o botão de "Adicionar Item" de um card de instrução geral
 * for clicado, essa função será chamada
 * @param cardName nome da seção
 * @param ulList o elemento da lista em que o item deverá ser adicionado
 * @private
 */
function _onInstrucaoCardAddItemClicked(cardName, ulList) {
    if (!isAdmin()) return; // Se não for admin, não deixa

    abrirModal("Adicionar Item", "", EntradasModal.TEXTO)
        .then(async texto => {
            if (!texto) return;
            showLoading();

            // Obtém os itens que já tem
            const cardSnapshot = await getDataFromDatabase(GeralDatabaseRef, `instrucoes-gerais/${cardName}`);

            if (!cardSnapshot || !cardSnapshot.exists())  {
                hideLoading();
                return;
            }

            const cardData = cardSnapshot.val();
            if (!cardData.itens) cardData.itens = []; // Se a lista não existir, cria ela

            // Se já tem esse texto, avisa o usuário e não salva
            if (cardData.itens.includes(texto)) {
                await abrirAlerta(`A instrução "${texto}" já existe!`);
                hideLoading();
                return;
            }

            // Adiciona o texto à lista de itens
            cardData.itens.push(texto);

            // Coloca a nova lista no banco de dados
            await set(refFromDatabase(GeralDatabaseRef, `instrucoes-gerais/${cardName}`), cardData);

            // Cria o elemento na tela
            _createRowOnInstrucoesGerais(ulList, texto, cardName);

            hideLoading();
        })
        .catch(e => {
            console.log("Erro ao adicionar item ao cartão de instruções: " + e);
            enviarErroParaSentry(e);
        });
}

/**
 * Quando uma instrução é atualizada, essa função é chamada.
 * @param textoAntigo o texto antes de atualizar
 * @param instrucaoEl o elemento da instrução (li)
 * @param cardName o nome do cartão
 * @private
 */
function _onInstrucaoCardUpdateInstrucao(textoAntigo, instrucaoEl, cardName) {
    if (!isAdmin()) return; // Se não for admin, não deixa

    abrirModal("Alterar Item", "", EntradasModal.TEXTO, {textPlaceholder: textoAntigo})
        .then(async texto => {
            if (!texto) return;
            if (texto === textoAntigo) return; // Se os textos forem iguais, não troca
            showLoading();

            // Obtém os itens que já tem
            const cardSnapshot = await getDataFromDatabase(GeralDatabaseRef, `instrucoes-gerais/${cardName}`);

            if (!cardSnapshot || !cardSnapshot.exists())
                return;

            const cardData = cardSnapshot.val();
            // Se a lista não existir, não é possível "editar" (impossível editar algo que não existe)
            if (!cardData.itens)
                return;
            // Se já houver a instrução (nova), retorna
            if (cardData.itens.includes(texto)) {
                hideLoading();
                await abrirAlerta("Essa instrução já existe!");
                return;
            }

            // Obtém o índice
            let index = cardData.itens.indexOf(textoAntigo);

            // Se não conseguiu achar, retorna
            if (index === -1) {
                hideLoading();
                await abrirAlerta("Não foi possível editar a instrução dada, pois ela não existe. Possivelmente, a instrução foi deletada.");
                return;
            }

            // Adiciona o texto à lista de itens
            cardData.itens[index] = texto;

            // Coloca a nova lista no banco de dados
            await set(refFromDatabase(GeralDatabaseRef, `instrucoes-gerais/${cardName}`), cardData);

            // Atualiza o elemento na tela
            instrucaoEl.firstChild.nodeValue = texto;
        })
        .finally(_ => {
            hideLoading();
        });
}

/**
 * Quando o tipo de um card for alterado, essa função será chamada
 * @param cardName nome do card
 * @param novoTipo novo tipo do card
 * @return {Promise<void>}
 * @private
 */
function _onInstrucaoCardTipoChanged(cardName, novoTipo) {
    if (!isAdmin()) return null; // Se não for admin, não deixa
    // Coloca o novo tipo no banco de dados
    return update(refFromDatabase(GeralDatabaseRef, `instrucoes-gerais/${cardName}`), {tipo: novoTipo});
}

/**
 * Quando uma instrução é removida, essa função é chamada
 * @param cardName nome do cartão
 * @param ulList elemento da lista
 * @param texto o texto da instrução que será removida
 * @param instrucaoEl o elemento da instrução
 * @private
 */
function _onInstrucaoCardRemoveInstrucao(cardName, ulList, texto, instrucaoEl) {
    if (!isAdmin()) return null; // Se não for admin, não deixa

    abrirModal("Apagar item", `Realmente deseja apagar o item <i>"${texto}"</i>?`, EntradasModal.SIM_OU_NAO)
        .then(async resultado => {
            if (!resultado) return;
            showLoading();

            // Obtém os itens que já tem
            const cardSnapshot = await getDataFromDatabase(GeralDatabaseRef, `instrucoes-gerais/${cardName}`);

            if (!cardSnapshot || !cardSnapshot.exists())
                return;

            const cardData = cardSnapshot.val();
            if (!cardData.itens) return; // Se a lista não existir, é impossível apagar algo

            const index = cardData.itens.indexOf(texto);

            // Se o índice for -1, não encontrou. Logo, não tem o que apagar
            if (index === -1)
                return;

            // Remove o texto da lista de itens
            cardData.itens.splice(index, 1);

            // Coloca a nova lista no banco de dados
            await set(refFromDatabase(GeralDatabaseRef, `instrucoes-gerais/${cardName}`), cardData);

            // Atualiza o valor com o novo texto
            instrucaoEl.remove();
        })
        .catch(e => {
            console.log("Erro ao remover item do cartão de instruções: " + e);
            enviarErroParaSentry(e);
        })
        .finally(_ => {
            hideLoading();
        });
}