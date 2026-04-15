import {Auth, Database} from "../config/firebase";

const dbRefPhotos = Database.ref('photos');
const dbRefUsers  = Database.ref('users');

const photoContainer = document.getElementById('photoContainer');
const photoAdminForm = document.getElementById('photoAdminForm');
const createPhotoBtn = document.getElementById('createPhoto');
const addPhotoBtn    = document.getElementById('addPhotoBtn');

let currentUserRole = 'user';

function isAdmin() {
    return currentUserRole === 'admin';
}

// Lista de fotos (todos veem)
function fillPhotoList() {
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

// Mostrar formulário de admin
createPhotoBtn.onclick = function () {
    if (!isAdmin()) return;
    showItem(photoAdminForm);
};

// Popular select de eventos (admin)
function populateEventSelectForPhotos() {
    if (!isAdmin()) return;

    const select = document.getElementById('selectEventForPhoto');
    select.innerHTML = '';

    dbRefEvents.once('value').then(snapshot => {
        snapshot.forEach(eventSnap => {
            const option = document.createElement('option');
            option.value = eventSnap.key;
            option.textContent = eventSnap.val().nome;
            select.appendChild(option);
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
            .then(() => fillPhotoList());
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

// Botão adicionar foto
addPhotoBtn.onclick = function (e) {
    e.preventDefault();
    if (!isAdmin()) return;

    const eventKey = document.getElementById('selectEventForPhoto').value;
    const url = document.getElementById('photoURL').value.trim();

    addLink(eventKey, url);
};

// Auth + role
Auth.onAuthStateChanged(user => {
    if (!user) return;

    dbRefUsers.child(user.uid).once('value').then(snapshot => {
        currentUserRole = snapshot.val()?.role || 'user';

        fillPhotoList(); // todos veem

        if (isAdmin()) {
            populateEventSelectForPhotos();
            showItem(createPhotoBtn);
        } else {
            hideItem(createPhotoBtn);
            hideItem(photoAdminForm);
        }
    });
});
