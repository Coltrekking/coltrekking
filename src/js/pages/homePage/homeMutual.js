/**
 * Código comum entre a página home de usuário e admin
 */
import {Auth, Database} from "../../../config/firebase";
import {checkAuth, deleteAccount, isAdmin, waitForUser} from "../../auth";
import {cancelEdit, editPersonalInfo, getRefFromDatabase, hideItem, showItem} from "../../utils";
import {openTab} from "../../tabs";
import {fillEventList} from "../../event";
import {onValue} from "firebase/database";

// Endereço da página de usuário
const USER_PAGE_ADDRESS = "/homePage.html"
// Endereço da página de admin
const ADMIN_PAGE_ADDRESS = "/homeAdmin.html"

export const createPhotoBtn = document.getElementById('createPhoto');
export const addPhotoBtn    = document.getElementById('addPhotoBtn');
export const photoContainer = document.getElementById('photoContainer');
export const photoAdminForm = document.getElementById('photoAdminForm');

export const dbRefPhotos = Database.ref('photos');
export const dbRefUsers  = Database.ref('users');
export const dbRefEvents  = Database.ref('event');

export function fillPhotoListAsAdmin() {
    dbRefEvents.once('value').then(eventsSnapshot => {
        const eventsArray = [];

        // transforma snapshot em array
        eventsSnapshot.forEach(eventSnap => {
            eventsArray.push({
                key: eventSnap.key,
                value: eventSnap.val()
            });
        });

        // ordena por data de inscrição (mais recente primeiro)
        eventsArray.sort((a, b) => {
            const tA = a.value.dataInscricao
                ? new Date(a.value.dataInscricao).getTime()
                : 0;
            const tB = b.value.dataInscricao
                ? new Date(b.value.dataInscricao).getTime()
                : 0;
            return tB - tA;
        });

        // monta os cards
        eventsArray.forEach(eventItem => {
            const eventKey  = eventItem.key;
            const eventData = eventItem.value;

            dbRefPhotos.child(eventKey).once('value').then(photoSnap => {
                const links = photoSnap.val() || [];
                const photoCard = document.createElement('div');
                photoCard.className = 'photo-card';

                const dataFormatada = eventData.data
                    ? new Date(eventData.data)
                        .toLocaleDateString('pt-BR')
                        .replace(/\//g, '.')
                    : '---';

                let linksHTML = '---';

                if (links.length > 0) {
                    linksHTML = links.map((link, index) => {
                        let html = `
                            <a href="${link}" target="_blank">
                                ${eventData.nome}_${dataFormatada}
                            </a>
                        `;

                        if (isAdmin()) {
                            html += `
                                <button class="danger"
                                    onclick="removeLink('${eventKey}', ${index})">
                                    Remover
                                </button>
                            `;
                        }

                        return html;
                    }).join('<br><br>');
                }

                photoCard.innerHTML = `
                    <h3>${eventData.nome}</h3>
                    <p>${linksHTML}</p>
                `;

                photoContainer.appendChild(photoCard);
            });
        });
    });
}

function fillPhotoListAsUser() {
    photoContainer.innerHTML = '';

    dbRefEvents.once('value').then(eventsSnapshot => {
        const eventsArray = [];

        // transforma snapshot em array
        eventsSnapshot.forEach(eventSnap => {
            eventsArray.push({
                key: eventSnap.key,
                value: eventSnap.val()
            });
        });

        // ordena por data de inscrição (mais recente primeiro)
        eventsArray.sort((a, b) => {
            const tA = a.value.dataInscricao
                ? new Date(a.value.dataInscricao).getTime()
                : 0;
            const tB = b.value.dataInscricao
                ? new Date(b.value.dataInscricao).getTime()
                : 0;
            return tB - tA;
        });

        // monta os cards
        eventsArray.forEach(eventItem => {
            const eventKey  = eventItem.key;
            const eventData = eventItem.value;

            dbRefPhotos.child(eventKey).once('value').then(photoSnap => {
                const links = photoSnap.val() || [];

                const photoCard = document.createElement('div');
                photoCard.className = 'photo-card';

                const dataFormatada = eventData.data
                    ? new Date(eventData.data)
                        .toLocaleDateString('pt-BR')
                        .replace(/\//g, '.')
                    : '---';

                let linksHTML = '---';

                if (links.length > 0) {
                    linksHTML = links.map(link => `
                        <a href="${link}" target="_blank">
                            ${eventData.nome}_${dataFormatada}
                        </a>
                    `).join('<br>');
                }

                photoCard.innerHTML = `
                    <h3>${eventData.nome}</h3>
                    <p>${linksHTML}</p>
                `;

                photoContainer.appendChild(photoCard);
            });
        });
    });
}

/**
 * Preenche a lista de fotos
 */
export function fillPhotoList() {
    photoContainer.innerHTML = '';

    if (isAdmin()) {
        fillPhotoListAsAdmin();
    } else {
        fillPhotoListAsUser();
    }
}

/**
 * Carrega os eventos comuns da página
 */
export function loadCommonEvents() {
    // Auth + role
    Auth.onAuthStateChanged(user => {
        if (!user) return;

        dbRefUsers.child(user.uid).once('value').then(snapshot => {
            fillPhotoList(); // todos veem

            if (isAdmin()) {
                //populateEventSelectForPhotos();
                showItem(createPhotoBtn);
            } else {
                hideItem(createPhotoBtn);
                hideItem(photoAdminForm);
            }
        });
    });

    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) signOutBtn.onclick = () => Auth.signOut();

    const editPersonalInfoBtn = document.getElementById("editPersonalInfoBtn");
    if (editPersonalInfoBtn) editPersonalInfoBtn.onclick = () => editPersonalInfo();

    const deleteAccountBtn = document.getElementById("deleteAccountBtn");
    if (deleteAccountBtn) deleteAccountBtn.onclick = () => deleteAccount();

    const cancelEditBtn = document.getElementById("cancelEditBtn");
    if (cancelEditBtn) cancelEditBtn.onclick = () => cancelEdit();

    const eventBtn = document.getElementById("eventBtn");
    if (eventBtn) eventBtn.onclick = (event) => openTab('eventos', event);

    const photoBtn = document.getElementById("photoBtn");
    if (photoBtn) photoBtn.onclick = (event) => {
        openTab('photos', event);
        fillPhotoList();
    };

    const blockListBtn = document.getElementById("blockListBtn");
    if (blockListBtn) {
        blockListBtn.onclick = (event) => openTab('lista-blocks', event);
    }

    const instructionBtn = document.getElementById("instructionBtn");
    if (instructionBtn) instructionBtn.onclick = (event) => openTab('instrucoes', event);

    // Os elementos abaixo existem para todos (e sempre vão existir para todos).
    // Portanto, não há necessidade de verificar a existência deles (nesse contexto)
    document.getElementById("eventBtn").onclick = (event) => {
        openTab('eventos', event);
    };
    document.getElementById("photoBtn").onclick = (event) => {
        openTab('photos', event);
        fillPhotoList();
    };
    document.getElementById("blockListBtn").onclick = (event) => {
        openTab('lista-blocks', event);
    };
    document.getElementById("instructionBtn").onclick = (event) => {
        openTab('instrucoes', event);
    };
}

/**
 * Carrega os eventos e outras coisas que as páginas têm em comum.
 * Isso serve para não precisar repetir código.
 */
async function loadCommon() {
    // Carrega o usuário (por padrão)
    await waitForUser();
    // Verifica a autenticação do usuário
    checkAuth()

    // Atualiza os eventos todas às vezes que algum dado atualizar
    onValue(getRefFromDatabase('event'), function (dataSnapshot) {
        fillEventList(dataSnapshot);
    });
}

// Se o usuário for administrador e ele estiver na página de user,
// ele será redirecionado para a página de admin
if (isAdmin()) {
    if (window.location.pathname === USER_PAGE_ADDRESS) {
        alert("Você será redirecionado para a página de administrador.")
        window.location.href = ADMIN_PAGE_ADDRESS;
    }
} else {
// Se o usuário não for administrador e estiver na página de admin,
// ele será redirecionado para a página de user
    if (window.location.pathname === ADMIN_PAGE_ADDRESS) {
        alert("Você não tem permissão de acessar essa página!")
        window.location.href = USER_PAGE_ADDRESS;
    }
}

// Carrega o que tem em comum
await loadCommon()


