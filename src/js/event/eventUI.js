/**
 * Código que lida com a interface visual dos eventos (dos cards dos eventos)
 * @since 2026-07
 */
import {formattedDate} from "../date";
import {getDataFromDatabase, PhotosDatabaseRef} from "../utils";
import {isAdmin} from "../auth";

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

// Retorna o id do elemento com o nome e o id dado
const getEventElementId = (name, id) => `event-${name}-${id}`;

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

    // TODO: se já tiver inscrito, coloca botão de desinscrever etc
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
        listaEventos.appendChild(elemento);
    }

    // Obtém o elemento (por string)
    const elementoString = getFormattedEventCard(eventId, eventData);
    elemento.insertAdjacentHTML('beforeend', elementoString);

    // Trata os eventos
    const inscreverBtn = document.getElementById(getEventElementId('inscrever-btn', eventId));
    const detalhesBtn = document.getElementById(getEventElementId('detalhes-btn', eventId));

    inscreverBtn.addEventListener('click', () => {

    });
    detalhesBtn.addEventListener('click', () => {
        fillEventModal(eventId, eventData);
        EventModalEl.style.display = 'flex';
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
                
                <div class="event-modal-photos-corner">
                    <img id="fotosMenuEventoLoading" src="/assets/icons/loading.svg" alt="Fotos" class="icon invert-color event-modal-top-button loading-animation">
                    <button id="fotosMenuEventoBtn" class="primary icon-button flex-center">
                        <img id="fotosMenuEventoImg" src="/assets/icons/loading.svg" alt="Fotos" class="icon invert-color">
                        <span id="fotosMenuEventoText" class="google-font font-bold text big-text white-color">Ver Fotos</span>
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

                <div class="event-modal-data">
                    <!-- 1 -->
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
                    <!-- 2 -->
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


                <div class="event-modal-buttons">
                    <button id="event-modal-inscrever-btn" class="primary event-modal-btn" style="cursor: pointer; display: inline-block;">Inscrever-se</button>
                    <button id="event-modal-cancelar-inscricao-btn" class="danger event-modal-btn" style="display: none;">Cancelar inscrição</button>
                </div>
        </div>
    `;

    // Injeta o modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
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

// Evento de fechar o modal
document.getElementById("fecharMenuEvento").addEventListener("click", () => {
    EventModalEl.style.display = "none";
});