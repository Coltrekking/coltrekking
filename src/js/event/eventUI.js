/**
 * Código que lida com a interface dos eventos (dos cards dos eventos)
 * @since 2026-07
 */
import {formattedDate} from "../date";

const EventModalEl = document.getElementById("eventModal"); // TODO: colocar id
const EventListEl = document.getElementById("listEvents");

// Id do Evento atualmente selecionado
let currentSelectedEvent = null;

// Retorna o id dp elemento com o nome e o id dado
const getDynamicElementId = (name, id) => `event-${name}-${id}`;

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
            <button id="${getDynamicElementId('inscrever-btn', id)}" class="primary event-btn">Inscrever-se</button>
            <button id="${getDynamicElementId('cancelar-inscricao-btn', id)}" class="danger event-btn" style="display: none;">Cancelar inscrição</button>
            <button id="${getDynamicElementId('detalhes-btn', id)}" class="primary event-btn">Ver Detalhes</button>
        </div>
    </div>
    `
}

/**
 * Preenche o modal de evento com os dados do evento selecionado
 * @param {Object} eventSnapshot dados do evento
 */
export function fillEventModal(eventSnapshot) {
    const eventData = eventSnapshot.value;

}

/**
 * Cria um card de evento na lista dos eventos com o evento dado
 * @param {Object} eventSnapshot dados do evento
 * @param {Object} listaEventos
 */
export function createEventCard(eventSnapshot, listaEventos) {
    const eventId = eventSnapshot.id;
    const eventData = eventSnapshot.value;

    // Obtém o elemento (por string)
    const elementoString = getFormattedEventCard(eventId, eventData);

    // Cria o elemento (transforma de string para um elemento em si)
    const elemento = document.createElement('div');
    elemento.classList.add('event-card');
    elemento.insertAdjacentHTML('beforeend', elementoString);

    // Adiciona o elemento na lista
    // NOTA: é importante fazer isso antes de tentar obter os botões!
    listaEventos.appendChild(elemento);

    // Trata os eventos
    const inscreverBtn = document.getElementById(getDynamicElementId('inscrever-btn', eventId));
    const detalhesBtn = document.getElementById(getDynamicElementId('detalhes-btn', eventId));

    inscreverBtn.addEventListener('click', () => {

    });
    detalhesBtn.addEventListener('click', () => {
       fillEventModal(eventSnapshot);

    });
}

// Adiciona o modal no site (se não houver)
if (!document.getElementById("event-modal")) {
    const modalHTML = `
        <div id="event-modal" class="event-modal-background" style="display: none">
            <div class="event-modal-content">
                <!-- Imagem do Evento -->
                <div class="event-modal-image"></div>

                <!-- Botões do topo -->
                <div class="top-buttons">
                    <button id="fecharMenuEvento" title="Fechar" class="icon-button">
                        <img src="/assets/icons/close-with-border-icon.svg" alt="Ícone de X, para fechar" class="close-modal-icon invert-color event-modal-top-button">
                    </button>
                </div>

                <h3 class="event-modal-title">Travessia: Diagonal Total (DT) &gt; Lapinha da Serra</h3>
                <p class="event-modal-description">tem 8 cachoeiras</p>

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