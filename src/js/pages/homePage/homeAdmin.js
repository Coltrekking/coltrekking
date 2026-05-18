/**
 * Código do homeAdmin.html
 */

import "./homePage"; // Carrega tudo que já haveria na homePage normalmente
import {
    editEventForm,
    eventForm, EventsDatabaseRef,
    getDataFromDatabase, getDataFromUser,
    hideItem,
    loading,
    PhotosDatabaseRef, refFromDatabase,
    showItem,
    submitEventForm
} from "../../utils";
import {abrirModal, abrirConfirmacao, EntradasModal} from "../../modal";
import {toggleUserManager, loadUsers, isAdmin} from "../../auth.js";
import {toggleBlockManager, loadBlockManager} from "../../listaBloqueiosAdmin"
import {
    fillPhotoList,
    createPhotoBtn,
    addPhotoBtn,
    loadCommonEvents
} from "./homeMutual";
import {
    atualizarEvento,
    cancelarFormEvento,
    criarEvento, editarPontuacaoNecessariaEventoAtual,
    fecharListaInscritos,
    getPontuacaoNecessariaEventoAtual, isUserEditingEvent
} from "../../eventAdmin";
import {Auth} from "/src/config/firebase";
import {onValue, set} from "firebase/database";
import {onAuthStateChanged} from "firebase/auth";

const editEventNeededPointsBtn = document.getElementById("eventoAlterarPontuacaoNecessaria");

/**
 * Popula o select que define o evento que um elemento de fotos está relacionado.
 */
export function populateEventSelectForPhotos() {
    if (!isAdmin()) return;

    // Obtém o elemento select
    const select = document.getElementById('selectEventForPhoto');
    if (!select) return;
    select.innerHTML = '';

    // Popula
    getDataFromDatabase(EventsDatabaseRef).then(snapshot => {
        snapshot.forEach(eventSnap => {
            const option = document.createElement('option');
            option.value = eventSnap.key;
            option.textContent = eventSnap.val().nome;
            select.appendChild(option);
        });
    });
}

// Adicionar link (admin)
function addLink(eventKey, url) {
    if (!isAdmin()) return;

    if (!eventKey || !url) {
        alert('Selecione o evento e informe o link.');
        return;
    }

    getDataFromDatabase(PhotosDatabaseRef, eventKey).then(snapshot => {
        const links = snapshot.val() || [];
        links.push(url);

        set(refFromDatabase(PhotosDatabaseRef, eventKey), links)
            .then(() => {
                fillPhotoList();
                document.getElementById('photoURL').value = '';
        });
    });
}

// Remover link (admin)
function removeLink(eventKey, linkIndex) {
    if (!isAdmin()) return;
    if (!confirm('Deseja remover este link?')) return;

    getDataFromDatabase(PhotosDatabaseRef, eventKey).then(snapshot => {
        const links = snapshot.val() || [];
        links.splice(linkIndex, 1);

        set(refFromDatabase(PhotosDatabaseRef, eventKey), links)
            .then(() => fillPhotoList());
    });
}

/**
 * Pergunta qual deve ser o valor da nova pontuação necessária para o evento atual, mostrando a pontuação atual.
 */
async function perguntarNovaPontuacaoNecessaria() {
    // Caso o usuário esteja editando, confirma se o usuário realmente quer fazer isso
    if (isUserEditingEvent()) {
        const confirmacao = await abrirConfirmacao(
            `Se você editar a pontuação necessária, <b>todos</b> os usuários com <b>menos pontos que a nova pontuação necessária</b> serão, automaticamente, <b>removidos do evento</b>.<br>Deseja continuar?`
        )
        if (!confirmacao) return; // Se o usuário cancelar, para a função
    }

    const pontuacaoEvento = await getPontuacaoNecessariaEventoAtual();
    const resultado = await abrirModal(
        "Pontuação Necessária para Inscrição",
        `A pontuação necessária para se inscrever nesse evento é <b>${pontuacaoEvento}</b>.<br>Deseja alterá-la para que valor?`,
        EntradasModal.NUMERO,
        {
            minNumber: 0 // define o mínimo para ser 0
        })

    // Se o resultado for null, significa que o usuário cancelou a ação, então não faz nada
    if (resultado === null) return;

    // Se chegou até aqui, o usuário colocou algo válido e confirmou a ação
    editarPontuacaoNecessariaEventoAtual(resultado);
}

/**
 * Carrega os eventos
 */
function loadEvents() {
    onAuthStateChanged(Auth,user => {
        if (!user) return;
        getDataFromUser(user.uid)
            .then(_ => {
                populateEventSelectForPhotos();
        });
    });

    // Quando os eventos atualizam
    onValue(EventsDatabaseRef, function (_dataSnapshot) {
        // Popula a lista de eventos na aba de fotos
        populateEventSelectForPhotos();
    });

    // Trata a exibição do formulário de eventos
    document.getElementById('createEvent').onclick = function () {
        showItem(eventForm);
        hideItem(loading);
        hideItem(editEventForm);
        showItem(submitEventForm);
        eventForm.reset();
    }

    // Trata a submissão do formulário de eventos
    eventForm.onsubmit = function (event) {
        event.preventDefault();
        criarEvento();
    }

    //trata a submissão do formulário de edição de eventos
    editEventForm.onclick = async function (event) {
        event.preventDefault();
        await atualizarEvento();
    };

    // botão cancelar (funciona tanto para criação quanto edição)
    document.getElementById('cancelEventForm').onclick = function () {
        cancelarFormEvento()
    };


    // botão de fechar lista
    const fecharInscritosBtn = document.getElementById("fecharInscritos");
    if (fecharInscritosBtn) {
        fecharInscritosBtn.addEventListener("click", () => {
            fecharListaInscritos();
        });
    }

    document.getElementById('toggleUserManagerBtn').onclick = () => toggleUserManager();

    const photoAdminForm = document.getElementById('photoAdminForm');
    document.getElementById('cancelPhotoAdminFormBtn').onclick = () => hideItem(photoAdminForm);
    document.getElementById("manageBlockBtn").onclick = () => toggleBlockManager();

    const userSearchInput = document.getElementById('userSearch');
    userSearchInput.oninput = () => loadUsers();

    const blockSearchInput = document.getElementById('blockSearch');
    blockSearchInput.oninput = () => loadBlockManager();

    createPhotoBtn.onclick = function () {
        if (!isAdmin()) return;
        showItem(photoAdminForm);
    };

    addPhotoBtn.onclick = (event) => {
        event.preventDefault();
        if (!isAdmin()) return;

        const eventKey = document.getElementById('selectEventForPhoto').value;
        const url = document.getElementById('photoURL').value.trim();

        addLink(eventKey, url);
    };

    editEventNeededPointsBtn.onclick = async () => perguntarNovaPontuacaoNecessaria();
}

function loadPage() {
    // Mostra os elementos de admin
    populateEventSelectForPhotos();
    showItem(createPhotoBtn);

    // Define a função removeLink como global
    window.removeLink = removeLink;

    loadCommonEvents();
    loadEvents();
}

if (isAdmin() && (window.location.pathname === "/homeAdmin.html" || window.location.pathname === "/homeAdmin")) loadPage();




