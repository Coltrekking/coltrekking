import {Database} from "../config/firebase";

const dbRefPhotos = Database.ref('photos');

// Elementos HTML
const photoContainer = document.getElementById('photoContainer');

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