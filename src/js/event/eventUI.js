/**
 * Código que lida com a interface dos eventos (dos cards dos eventos)
 * @since 2026-07
 */
import {formattedDate} from "../date";

const EventModalEl = document.getElementById("eventModal"); // TODO: colocar id
const EventListEl = document.getElementById("listEvents");

// Id do Evento atualmente selecionado
let currentSelectedEvent = null;

/**
 * Retorna uma string com o elemento do cartão do evento dado.
 * @param eventData dados do evento
 * @return {string} elemento do cartão do evento
 */
function getFormattedEventCard(eventData) {
    return `
    <div class="event-card-blur"></div>

    <div class="event-card-content">
        <h3 class="event-title">${eventData.nome}</h3>
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
                <span>${(eventData.distancia + ' km') || '---'}</span>
            </div>
        </div>
        <div class="event-buttons">
            <button class="primary event-btn">Inscrever-se</button>
            <button class="primary event-btn">Ver Detalhes</button>
        </div>
    </div>
    `
}

/**
 * Preenche o modal de evento com os dados do evento selecionado
 * @param {Object} eventData dados do evento
 */
export function fillEventModal(eventData) {

}

/**
 * Cria um card de evento na lista dos eventos com o evento dado
 * @param {Object} eventData dados do evento
 * @param {Object} listaEventos
 */
export function createEventCard(eventData, listaEventos) {
    const elementoString = getFormattedEventCard(eventData);

    const elemento = document.createElement('div');
    elemento.classList.add('event-card');

    elemento.insertAdjacentHTML('beforeend', elementoString);
    listaEventos.appendChild(elemento);
}