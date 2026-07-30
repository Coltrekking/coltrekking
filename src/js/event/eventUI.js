/**
 * Código que lida com a interface visual dos eventos (dos cards dos eventos)
 * @since 2026-07
 */
import {formattedDate} from "../date";
import {getDataFromDatabase, getRealTime, InscricoesDatabaseRef, PhotosDatabaseRef} from "../utils";
import {isAdmin} from "../auth";
import {Auth} from "../../config/firebase";
import {abrirAlerta} from "../modal";
import {enviarErroParaSentry} from "../main";

// Elementos do event modal
// (São definidos mais tarde, depois que há certeza que os elementos estão no site)
let EventModalEl;
let EventModalImgEl;
let EventModalTitleEl;
let EventModalDescriptionEl;
let EventModalInscricaoEl;
let EventModalEventoEl;
let EventModalPontoEncontroEl;
let EventModalPrelecaoEl;
let EventModalDificuldadeEl;
let EventModalDistanciaEl;
let EventModalSubidaEl;
let EventModalDescidaEl;
let EventModalTrajetoEl;
let EventModalInscreverBtnEl;
let EventModalCancelarInscricaoBtnEl;
let EventModalFotosLoading;
let EventModalFotosText;
let EventModalFotosBtn;
let EventModalFotosImg;


// Ícones para as ações relacionadas às imagens dos eventos
// (o ícone que aperta para abrir a tela de imagens)
const EventImagesIcons = {
    "add": "/assets/icons/add-image-icon.svg",
    "view": "/assets/icons/image-icon.svg",
    "no_image": "/assets/icons/no-image-icon.svg"
}

// Id do Evento atualmente selecionado
let currentSelectedEvent = null;

// Funções de inscrever/desinscrever.
// São definidas mais tarde pelo event.js
let subscribeToEvent;
let unsubscribeFromEvent;

// Retorna o id do elemento com o nome e o id dado
const getEventElementId = (name, id) => `event-${name}-${id}`;

/**
 * Define as funções de inscrever/desinscrever locais (do eventUI.js)
 * como as funções dadas.
 * @param subscribe função de inscrever
 * @param unsubscribe função de desinscrever
 */
export function setSubscribeAndUnsubscribeFunctions(subscribe, unsubscribe) {
    subscribeToEvent = subscribe;
    unsubscribeFromEvent = unsubscribe;
}

// Estados do botão de inscrição/desinscrição
const SubscribeButtonStates = Object.freeze({  // O `Object.freeze()` certifica que não é possível atualizar
    INSCREVER: 'Inscrever',
    DESINSCREVER: 'Desinscrever',
    EVENTO_REALIZADO: 'eventoRealizado',
    NAO_HABILITADO: 'naoHabilitado'
    // Lembre-se: se adicionar um novo estado, atualize a função setSubscribeButtonState() para refletir o estado visual do botão
});
/**
 * Define o estado do botão de inscrição/desinscrição a partir do estado dado.
 * @param button o elemento do botão a ser modificado
 * @param state estado do botão, dado pelos estados do SubscribeButtonStates
 */
function setSubscribeButtonState(button, state) {
    if (!button)
        throw new Error("Botão dado para definir o estado é inválido!")
    switch (state) {
        case SubscribeButtonStates.INSCREVER: {
            button.textContent = 'Inscrever-se';
            button.className = 'primary event-btn';
            //button.style.backgroundColor = '#ccc';
            button.style.backgroundColor = '';
            button.style.outline = '';
            button.style.cursor = 'pointer';
            button.disabled = false;
            break;
        }
        case SubscribeButtonStates.DESINSCREVER: {
            button.textContent = 'Cancelar inscrição';
            button.className = 'danger event-btn';
            button.style.backgroundColor = '';
            button.style.outline = '';
            button.style.display = 'none';
            break;
        }
        case SubscribeButtonStates.EVENTO_REALIZADO: {
            // button.style.backgroundColor = '#008000';
            button.className = 'past-event event-btn';
            button.textContent = 'Evento realizado';
            button.style.backgroundColor = '';
            button.style.outline = '';
            button.disabled = true;
            button.style.cursor = 'not-allowed';
            break;
        }

        case SubscribeButtonStates.NAO_HABILITADO: {
            button.style.backgroundColor = '#ccc';
            button.style.outline = '2px solid #ccc';
            button.disabled = true;
            button.style.cursor = 'not-allowed';
            break;
        }
    }
}

/**
 * Dependendo do estado, deixa os botões visíveis ou não (apenas um
 * estará visível por vez)
 * @param state se está inscrito
 * @param subscribeBtn botão de inscrever
 * @param unsubscribeBtn botão de desinscrever
 */
export function setSubscribeButtons(state, subscribeBtn, unsubscribeBtn) {
    if (!subscribeBtn || !unsubscribeBtn) {
        enviarErroParaSentry(new Error("Botão de inscrever ou desinscrever não existe."));
        return;
    }
    if (state) {
        subscribeBtn.style.display = 'none';
        unsubscribeBtn.style.display = 'inline-block';
    } else {
        subscribeBtn.style.display = 'inline-block';
        unsubscribeBtn.style.display = 'none';
    }
}

/**
 * Retorna uma string com o elemento do cartão do evento dado.
 * @param {String} id id do evento
 * @param {Object} eventData dados do evento
 * @return {string} elemento do cartão do evento
 */
function getFormattedEventCard(id, eventData) {
    return `
    <div class="event-card-blur"></div>

    <div class="event-card-content">
        <h3 class="event-title">${eventData.nome || '---' }</h3>
        <div class="event-info">
            <div class="text event-info-text-icon">
                <img src="/assets/icons/calendar-icon.svg" class="event-info-icon" alt="Ícone de calendário">
                <span>${eventData.data ? formattedDate(eventData.data) : '---'}</span>
            </div>
            <div class="text event-info-text-icon">
                <img src="/assets/icons/mountain-icon.svg" class="event-info-icon" alt="Ícone de montanha">
                <span>${eventData.dificuldade || '---'}</span>
            </div>
            <div class="text event-info-text-icon">
                <img src="/assets/icons/trail-icon.svg" class="event-info-icon" alt="Ícone de uma pessoa fazendo uma caminhada">
                <span>${(eventData.distancia || '---') + ' km'}</span>
            </div>
        </div>
        <div class="event-buttons">
            <button id="${getEventElementId('inscrever-btn', id)}" class="primary event-btn">Inscrever-se</button>
            <button id="${getEventElementId('cancelar-inscricao-btn', id)}" class="danger event-btn" style="display: none;">Cancelar inscrição</button>
            <button id="${getEventElementId('detalhes-btn', id)}" class="primary event-btn">Ver Detalhes</button>
        </div>
    </div>
    `
}

/**
 * Lida com as atualizações de inscrição/desinscrição de um evento.
 * @param eventData o evento em que se quer colocar o botão
 * @param key o uid do evento
 * @param buttons os botões de inscrever/desinscrever (em um mapa)
 */
function setupSubscribeObserver(key, eventData, buttons) {
    const eventDate = eventData.data ? new Date(eventData.data) : null;

    const subscribeBtn = buttons.subscribe;
    setSubscribeButtonState(subscribeBtn, SubscribeButtonStates.INSCREVER);
    subscribeBtn.disabled = true; // começa desativado
    subscribeBtn.style.cursor = 'not-allowed';

    const unsubscribeBtn = buttons.unsubscribe;
    setSubscribeButtonState(unsubscribeBtn, SubscribeButtonStates.DESINSCREVER);

    // verifica se já é hora de inscrição e se ainda não passou a data do evento
    function checkSubscriptionTime() {
        // pega a hora do evento
        const eventStart = eventData.dataInscricao ? new Date(eventData.dataInscricao) : null;

        if (!eventStart) return;

        const now = getRealTime();

        // se ainda não chegou a hora de inscrição
        if (now < eventStart.getTime()) {
            setSubscribeButtonState(subscribeBtn, SubscribeButtonStates.NAO_HABILITADO);
            return;
        }

        // se a data do evento já passou
        if (eventDate && now > eventDate.getTime()) {
            setSubscribeButtonState(subscribeBtn, SubscribeButtonStates.EVENTO_REALIZADO);
            clearInterval(subscriptionTimer);
            return;
        }

        // se está no período válido de inscrição
        setSubscribeButtonState(subscribeBtn, SubscribeButtonStates.INSCREVER);
    }

    // chama a função a cada segundo até habilitar
    const subscriptionTimer = setInterval(checkSubscriptionTime, 100);
    checkSubscriptionTime(); // checa imediatamente

    // verifica se o usuário já está inscrito
    getDataFromDatabase(InscricoesDatabaseRef, key + '/' + Auth.currentUser.uid)
        .then(snapshot => {
            if (snapshot.exists()) {
                subscribeBtn.style.display = 'none';
                unsubscribeBtn.style.display = 'inline-block';

                // checa se a data do evento já passou
                const eventDate = eventData.data ? new Date(eventData.data) : null;
                if (eventDate && getRealTime() > eventDate.getTime()) {
                    setSubscribeButtonState(unsubscribeBtn, SubscribeButtonStates.EVENTO_REALIZADO);
                }
            }
        });

    // chama subscribe passando ambos os botões
    subscribeBtn.onclick = () => {
        const eventStart = new Date(eventData.dataInscricao);

        //camada extra de segurança
        if (getRealTime() < eventStart.getTime()) {
            abrirAlerta("⚠️ Inscrições ainda não começaram para este evento.").then( );
            return;
        }

        subscribeToEvent(key, buttons.subscribe, buttons.unsubscribe);
    };

    unsubscribeBtn.onclick = () => {
        unsubscribeFromEvent(key, buttons.subscribe, buttons.unsubscribe);
    };
}

/**
 * Preenche o modal de evento com os dados do evento selecionado
 * @param {String} eventId id do evento
 * @param {Object} eventData dados do evento
 */
export function fillEventModal(eventId, eventData) {
    currentSelectedEvent = eventId;

    // Faz o loading de "obter fotos" aparecer para mostrar já está tentando obter as fotos
    // e desaparece o botão de "ver fotos"
    EventModalFotosBtn.style.display = 'none';
    EventModalFotosLoading.style.display = 'flex';

    console.log("TODO: adicionar imagem"); // TODO: adicionar imagem
    EventModalImgEl.style.backgroundImage = `url(${eventData.imagem || '/assets/images/default-event-image.jpg'})`;

    EventModalTitleEl.innerText = eventData.nome || '---';
    EventModalDescriptionEl.innerText = eventData.descricao || '---';
    EventModalInscricaoEl.innerText = eventData.dataInscricao ? formattedDate(eventData.dataInscricao) : '---';
    EventModalEventoEl.innerText = eventData.data ? formattedDate(eventData.data) : '---';
    EventModalPontoEncontroEl.innerText = eventData.localEncontro || '---';
    EventModalPrelecaoEl.innerText = eventData.dataPrelecao && eventData.localPrelecao
        ? `${formattedDate(eventData.dataPrelecao)}, ${eventData.localPrelecao}`
        : '---';
    EventModalDificuldadeEl.innerText = eventData.dificuldade || '---';
    EventModalDistanciaEl.innerText = eventData.distancia ? `${eventData.distancia}km` : '---';
    EventModalSubidaEl.innerText = eventData.subida ? `${eventData.subida}m` : '---';
    EventModalDescidaEl.innerText = eventData.descida ? `${eventData.descida}m` : '---';
    EventModalTrajetoEl.innerText = eventData.trajeto || '---';

    // Esconde o botão se não houver fotos (ou, se for admin,
    // troca para algo que indique para adicionar uma foto)
    getEventPhotos(eventId).then(links => {
        if (links.length === 0) {
            if (!isAdmin()) { // Se o usuário não for admin, mostra o botão como sem imagem
                EventModalFotosImg.src = EventImagesIcons.no_image;
                EventModalFotosText.textContent = "Não há fotos"
                EventModalFotosBtn.disabled = true;
            } else { // Se for admin, troca para a foto de adicionar imagem
                EventModalFotosImg.src = EventImagesIcons.add;
                EventModalFotosText.textContent = "Adicionar Fotos"
            }
        } else {
            // Se houver fotos
            EventModalFotosImg.src = EventImagesIcons.view;
            EventModalFotosText.textContent = "Ver Fotos"
        }

        // Como terminou de carregar, desaparece o loading
        EventModalFotosLoading.style.display = 'none';
        EventModalFotosBtn.style.display = 'flex';
    });

    // Se já tiver realizado
    const now = getRealTime();
    const eventDate = eventData.data ? new Date(eventData.data) : null;
    if (eventDate && now > eventDate.getTime()) {
        setSubscribeButtonState(EventModalInscreverBtnEl, SubscribeButtonStates.EVENTO_REALIZADO);
        setSubscribeButtons(false, EventModalInscreverBtnEl, EventModalCancelarInscricaoBtnEl);
    } else {
        // verifica se o usuário já está inscrito
        getDataFromDatabase(InscricoesDatabaseRef, eventId + '/' + Auth.currentUser.uid)
            .then(snapshot => {
                setSubscribeButtons(snapshot.exists(), EventModalInscreverBtnEl, EventModalCancelarInscricaoBtnEl);
            });
    }
}

/**
 * Cria um card de evento na lista dos eventos com o evento dado
 * @param {Object} eventSnapshot dados do evento
 * @param {Object} listaEventos elemento da lista de eventos
 */
export function createEventCard(eventSnapshot, listaEventos) {
    const eventId = eventSnapshot.key;
    const eventData = eventSnapshot.value;

    const cardElementId = getEventElementId('card', eventId);

    let elemento = document.getElementById(cardElementId);
    if (elemento) {
        elemento.replaceChildren(); // limpa o cartão
    } else {
        // Cria o elemento (transforma de string para um elemento em si)
        elemento = document.createElement('div');
        elemento.classList.add('event-card');
        elemento.id = cardElementId;

        // Adiciona o elemento na lista de eventos
        // NOTA: é importante fazer isso antes de tentar obter os botões!
        // NOTA 2: isso faz o evento ser colocado na tela antes de haver coisas dentro.
        //         Por mais que isso não seja recomendado (se sentir necessidade, pode
        //         colocar depois do "insertAdjacentHTML" abaixo), é por um mínimo
        //         tempo que a div ficaria sem vazia.
        listaEventos.appendChild(elemento);
    }

    // Obtém o elemento (por string)
    const elementoString = getFormattedEventCard(eventId, eventData);
    elemento.insertAdjacentHTML('beforeend', elementoString);

    // Trata os eventos
    const inscreverBtn = document.getElementById(getEventElementId('inscrever-btn', eventId));
    const desinscreverBtn = document.getElementById(getEventElementId('cancelar-inscricao-btn', eventId));
    const detalhesBtn = document.getElementById(getEventElementId('detalhes-btn', eventId));

    setupSubscribeObserver(eventId, eventData, {subscribe: inscreverBtn, unsubscribe: desinscreverBtn});

    detalhesBtn.addEventListener('click', () => {
        fillEventModal(eventId, eventData);
        EventModalEl.style.display = 'flex';
    });
}

/**
 * Retorna os links das fotos do evento dado.
 * @param eventId id do evento que se deseja obter os links das fotos
 * @return {Promise<Array>} uma promessa que resolve para um array de links das fotos do evento dado.
 */
function getEventPhotos(eventId) {
    return getDataFromDatabase(PhotosDatabaseRef, eventId).then(snapshot => {
        // Obtém os links
        return snapshot.val() || [];
    });
}

/**
 * Carrega os eventos (listeners) da página.
 */
function loadPageEvents() {

    // Evento de fechar o modal
    document.getElementById("fecharMenuEvento").addEventListener("click", () => {
        EventModalEl.style.display = "none";
    });

    EventModalInscreverBtnEl.addEventListener('click', () => {
        subscribeToEvent(currentSelectedEvent, EventModalInscreverBtnEl, EventModalCancelarInscricaoBtnEl);
    });
    EventModalCancelarInscricaoBtnEl.addEventListener('click', () => {
        unsubscribeFromEvent(currentSelectedEvent, EventModalInscreverBtnEl, EventModalCancelarInscricaoBtnEl);
    });
}

// Adiciona o modal no site (se não houver)
if (!document.getElementById("event-modal")) {
    const modalHTML = `
        <div id="event-modal" class="event-modal-background" style="display: none">
            <div class="event-modal-content" style="position: relative;">
                <!-- Imagem do Evento -->
                <div class="event-modal-image" id="event-modal-image" style="position: relative;">
                </div>
                
                <!-- Botão de Ver Fotos -->
                <div class="event-modal-photos-corner">
                    <img id="fotosMenuEventoLoading" src="/assets/icons/loading.svg" alt="Fotos" class="icon invert-color event-modal-top-button loading-animation">
                    <button id="fotosMenuEventoBtn" class="primary icon-button flex-center">
                        <img id="fotosMenuEventoImg" src="/assets/icons/loading.svg" alt="Fotos" class="icon">
                        <span id="fotosMenuEventoText" class="google-font font-bold text big-text black-color">Ver Fotos</span>
                    </button>
                </div>
                
                <!-- Botões do topo -->
                <div class="top-buttons">
                    <button id="fecharMenuEvento" title="Fechar" class="icon-button">
                        <img src="/assets/icons/close-thicker-icon.svg" alt="Ícone de X, para fechar" class="close-modal-icon invert-color event-modal-top-button">
                    </button>
                </div>

                <h3 class="event-modal-title" id="event-modal-title">Titulo</h3>
                <p class="event-modal-description" id="event-modal-description">Descrição</p>

                <!-- Informações do Evento -->
                <div class="event-modal-data">
                    <!-- Linha 1 -->
                    <div>
                        <p class="google-font font-bold text-align-left">Evento</p>
                        <div class="event-modal-line">
                            <div class="text event-modal-text-icon" title="Data da Inscrição">
                                <span class="event-modal-info-title">
                                    <img src="/assets/icons/pen-icon.svg" class="event-modal-icon" alt="Ícone de calendário">
                                    <span>Inscrição</span>
                                </span>
                                <span id="event-modal-inscricao" class="event-modal-info-value">13/07/2026 20:00</span>
                            </div>
                            <div class="text event-modal-text-icon" title="Data do Evento">
                                <span class="event-modal-info-title">
                                    <img src="/assets/icons/calendar-icon.svg" class="event-modal-icon invert-color" alt="Ícone de calendário">
                                    <span>Evento</span>
                                </span>
                                <span id="event-modal-evento" class="event-modal-info-value" >01/08/2026 07:30</span>
                            </div>
                            <div class="text event-modal-text-icon" title="Ponto de Encontro">
                                <span class="event-modal-info-title">
                                    <img src="/assets/icons/location-pin-icon.svg" class="event-modal-icon" alt="Ícone de localização">
                                    <span>Ponto de Encontro</span>
                                </span>
                                <span id="event-modal-ponto-encontro" class="event-modal-info-value">Escola de Belas Artes</span>
                            </div>
                            <div class="text event-modal-text-icon" title="Data e local da Preleção">
                                <span class="event-modal-info-title">
                                    <img src="/assets/icons/presentation-icon.svg" class="event-modal-icon" alt="Ícone de calendário">
                                    <span>Preleção</span>
                                </span>
                                <span id="event-modal-prelecao" class="event-modal-info-value">15/07/2026 12:00, Auditório</span>
                            </div>
                        </div>
                    </div>
                    <!-- Linha 2 -->
                    <div>
                        <p class="google-font font-bold text-align-left">Trilha</p>

                        <div class="event-modal-line">
                            <div class="text event-modal-text-icon" title="Dificuldade">
                                <span class="event-modal-info-title">
                                    <img src="/assets/icons/mountain-icon.svg" class="event-modal-icon invert-color" alt="Ícone de montanha">
                                    <span>Dificuldade</span>
                                </span>
                                <span class="event-modal-info-value" id="event-modal-dificuldade">Fácil pacas ++</span>
                            </div>
                            <div class="text event-modal-text-icon" title="Distância">
                                <span class="event-modal-info-title">
                                    <img src="/assets/icons/trail-icon.svg" class="event-modal-icon invert-color" alt="Ícone de uma pessoa fazendo uma caminhada">
                                    <span>Distância</span>
                                </span>
                                <span class="event-modal-info-value" id="event-modal-distancia">18km</span>
                            </div>
                            <div class="text event-modal-text-icon">
                                <span class="event-modal-info-title">
                                    <img src="/assets/icons/ruler-icon.svg" class="event-modal-icon" alt="Régua">
                                    <span>Altimetria</span>
                                </span>
                                <div class="event-modal-info-value event-modal-info-altimetria">
                                    <div class="flex-row" title="Subida">
                                        <img src="/assets/icons/up-arrow-icon.svg" class="event-modal-icon" alt="Seta para cima">
                                        <span id="event-modal-subida">400m</span>
                                    </div>

                                    <div class="flex-row" title="Descida">
                                        <img src="/assets/icons/down-arrow-icon.svg" class="event-modal-icon" alt="Seta para baixo">
                                        <span id="event-modal-descida">400m</span>
                                    </div>
                                </div>
                            </div>
                            <div class="text event-modal-text-icon" title="Trajeto">
                                <span class="event-modal-info-title">
                                    <img src="/assets/icons/path-with-two-points-icon.svg" class="event-modal-icon" alt="Rota com dois pontos marcados nas pontas">
                                    <span>Trajeto</span>
                                </span>
                                <span class="event-modal-info-value" id="event-modal-trajeto">Circuito</span>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Botões da parte de baixo -->
                <div class="event-modal-buttons">
                    <button id="event-modal-inscrever-btn" class="primary event-modal-btn" style="cursor: pointer; display: inline-block;">Inscrever-se</button>
                    <button id="event-modal-cancelar-inscricao-btn" class="danger event-modal-btn" style="display: none;">Cancelar inscrição</button>
                </div>
        </div>
    `;

    // Injeta o modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

EventModalEl = document.getElementById("event-modal");
EventModalImgEl = document.getElementById("event-modal-image");
EventModalTitleEl = document.getElementById("event-modal-title");
EventModalDescriptionEl = document.getElementById("event-modal-description");
EventModalInscricaoEl = document.getElementById("event-modal-inscricao");
EventModalEventoEl = document.getElementById("event-modal-evento");
EventModalPontoEncontroEl = document.getElementById("event-modal-ponto-encontro");
EventModalPrelecaoEl = document.getElementById("event-modal-prelecao");
EventModalDificuldadeEl = document.getElementById("event-modal-dificuldade");
EventModalDistanciaEl = document.getElementById("event-modal-distancia");
EventModalSubidaEl = document.getElementById("event-modal-subida");
EventModalDescidaEl = document.getElementById("event-modal-descida");
EventModalTrajetoEl = document.getElementById("event-modal-trajeto");
EventModalInscreverBtnEl = document.getElementById("event-modal-inscrever-btn");
EventModalCancelarInscricaoBtnEl = document.getElementById("event-modal-cancelar-inscricao-btn");
EventModalFotosLoading = document.getElementById("fotosMenuEventoLoading");
EventModalFotosText = document.getElementById("fotosMenuEventoText");
EventModalFotosBtn = document.getElementById("fotosMenuEventoBtn");
EventModalFotosImg = document.getElementById("fotosMenuEventoImg");

loadPageEvents();