/**
 * Código do homeAdmin.html
 */

import "./homePage"; // Carrega tudo que já haveria na homePage normalmente //TODO
import {editEventForm, eventForm, hideItem, loading, showItem, submitEventForm} from "../../utils";
import {toggleUserManager, loadUsers, isAdmin} from "../../auth.js";
import {toggleBlockManager, loadBlockManager} from "../../listaBloqueiosAdmin"
import {
    dbRefPhotos,
    dbRefEvents,
    fillPhotoList,
    createPhotoBtn,
    addPhotoBtn,
    loadCommonEvents, dbRefUsers, fillPhotoListAsAdmin,
} from "./homeMutual";
import {atualizarEvento, cancelarFormEvento, criarEvento, fecharListaInscritos} from "../../eventAdmin";
import {Auth} from "../../../config/firebase";


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
    dbRefEvents.once('value').then(snapshot => {
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

    dbRefPhotos.child(eventKey).once('value').then(snapshot => {
        const links = snapshot.val() || [];
        links.push(url);

        dbRefPhotos.child(eventKey).set(links).then(() => {
            fillPhotoList();
            document.getElementById('photoURL').value = '';
        });
    });
}

// Remover link (admin)
function removeLink(eventKey, linkIndex) {
    if (!isAdmin()) return;
    if (!confirm('Deseja remover este link?')) return;

    dbRefPhotos.child(eventKey).once('value').then(snapshot => {
        const links = snapshot.val() || [];
        links.splice(linkIndex, 1);

        dbRefPhotos.child(eventKey).set(links)
            .then(() => fillPhotoListAsAdmin());
    });
}

/**
 * Carrega os eventos
 */
function loadEvents() {
    Auth.onAuthStateChanged(user => {
        dbRefUsers.child(user.uid).once('value').then(_ => {
            populateEventSelectForPhotos();
        });
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

if (isAdmin() && window.location.pathname === "/homeAdmin.html") loadPage();




