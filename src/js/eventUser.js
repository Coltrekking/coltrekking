// função para preencher a lista de eventos
import {Auth, Database} from "../config/firebase";

function fillEventList(dataSnapshot) {
    const eventContainer = document.getElementById('eventContainer');
    const eventCount = document.getElementById('eventCount');
    eventContainer.innerHTML = ''; // limpa container
    eventCount.innerHTML = 'Carregando eventos...';

    const eventosArray = [];
    dataSnapshot.forEach(item => {
        eventosArray.push({ key: item.key, value: item.val() });
    });

    eventosArray.sort((a, b) => {
        const tA = a.value.dataInscricao ? new Date(a.value.dataInscricao).getTime() : 0;
        const tB = b.value.dataInscricao ? new Date(b.value.dataInscricao).getTime() : 0;
        return tB - tA; // mais recente primeiro
    });

    const uid = localStorage.getItem('uid');
    if (!uid) {
        console.warn('UID não encontrado no localStorage.');
        hideItem(loading);
        return;
    }

    Database.ref('/users/' + uid).once('value')
        .then(userSnapshot => {
            eventCount.innerHTML = 'Total de eventos: ' + eventosArray.length;

            eventosArray.forEach(item => {
                const value = item.value;
                if (document.getElementById(item.key)) return; // evita duplicação

                const eventCard = document.createElement('div');
                eventCard.className = 'event-card';
                eventCard.id = item.key;

                eventCard.innerHTML = `
                    <h3>${value.nome}</h3>
                    <h4>${value.descricao || '---'}</h4>
                    <p>Data: ${value.data ? formattedDate(value.data) : '---'}</p>
                    <p>Ponto de Encontro: ${value.localEncontro || '---'}</p>
                    <p>Data de Inscrição: ${value.dataInscricao ? formattedDate(value.dataInscricao) : '---'}</p>
                    <p>Data da Preleção: ${value.dataPrelecao ? formattedDate(value.dataPrelecao) : '---'}</p>
                    <p>Local da preleção: ${value.localPrelecao || '---'}</p>
                    <p>Dificuldade: ${value.dificuldade || '---'}</p>
                    <p>Distância: ${value.distancia || '---'} km</p>
                    <p>Subida: ${value.subida || '---'} m</p>
                    <p>Descida: ${value.descida || '---'} m</p>
                    <p>Trajeto: ${value.trajeto || '---'}</p>
                `;

                /* inserir altimentria depois (precisa do cloud storage)
                <p>Altimetria:<br>
                    ${value.percursoAltimetria
                    ? `<img src="${value.percursoAltimetria}" alt="altimetria" style="max-width: 100%;">`
                    : '---'}
                </p>
                */

                const subscribeBtn = document.createElement('button');
                subscribeBtn.textContent = 'Inscrever-se';
                subscribeBtn.className = 'primary eventBtn';
                subscribeBtn.disabled = true; // começa desativado
                subscribeBtn.style.backgroundColor = '#ccc';
                subscribeBtn.style.cursor = 'not-allowed';

                // pega a hora do evento
                const eventStart = value.dataInscricao ? new Date(value.dataInscricao) : null;
                const eventDate = value.data ? new Date(value.data) : null;

                // verifica se já é hora de inscrição e se ainda não passou a data do evento
                function checkSubscriptionTime() {
                    if (!eventStart) return;

                    const now = Date.now();

                    // se ainda não chegou a hora de inscrição
                    if (now < eventStart.getTime()) {
                        subscribeBtn.disabled = true;
                        subscribeBtn.style.backgroundColor = '#ccc';
                        subscribeBtn.style.cursor = 'not-allowed';
                        return;
                    }

                    // se a data do evento já passou
                    if (eventDate && now > eventDate.getTime()) {
                        subscribeBtn.disabled = true;
                        subscribeBtn.style.backgroundColor = '#008000';
                        subscribeBtn.style.cursor = 'not-allowed';
                        subscribeBtn.textContent = 'Evento realizado';
                        clearInterval(subscriptionTimer);
                        return;
                    }

                    // se está no período válido de inscrição
                    subscribeBtn.disabled = false;
                    subscribeBtn.style.backgroundColor = '';
                    subscribeBtn.style.cursor = 'pointer';
                }

                // chama a função a cada segundo até habilitar
                const subscriptionTimer = setInterval(checkSubscriptionTime, 100);
                checkSubscriptionTime(); // checa imediatamente

                const unsubscribeBtn = document.createElement('button');
                unsubscribeBtn.textContent = 'Cancelar inscrição';
                unsubscribeBtn.className = 'danger eventBtn';
                unsubscribeBtn.style.display = 'none';

                // verifica se o usuário já está inscrito
                Database.ref('inscricoes/' + item.key + '/' + uid)
                    .once('value')
                    .then(snapshot => {
                        if (snapshot.exists()) {
                            subscribeBtn.style.display = 'none';
                            unsubscribeBtn.style.display = 'inline-block';

                            // checa se a data do evento já passou
                            const eventDate = value.data ? new Date(value.data) : null;
                            if (eventDate && Date.now() > eventDate.getTime()) {
                                unsubscribeBtn.disabled = true;
                                unsubscribeBtn.style.backgroundColor = '#008000';
                                unsubscribeBtn.style.cursor = 'not-allowed';
                                unsubscribeBtn.textContent = 'Evento realizado';
                            }
                        }
                    });

                // chama subscribe passando ambos os botões
                subscribeBtn.onclick = () => {
                    const eventStart = new Date(value.dataInscricao);

                    //camada extra de segurança
                    if (Date.now() < eventStart.getTime()) {
                        alert("⚠️ Inscrições ainda não começaram para este evento.");
                        return;
                    }

                    subscribeToEvent(item.key, subscribeBtn, unsubscribeBtn);
                };

                unsubscribeBtn.onclick = () => {
                    unsubscribeFromEvent(item.key, unsubscribeBtn, subscribeBtn);
                };

                eventCard.appendChild(subscribeBtn);
                eventCard.appendChild(unsubscribeBtn);
                eventContainer.appendChild(eventCard);
            });

            hideItem(loading);
        })
        .catch(err => {
            console.error('Erro ao buscar usuário:', err);
            hideItem(loading);
        });
}

// funcção para inscrever em evento
function subscribeToEvent(eventId, subscribeBtn, unsubscribeBtn) {
    const user = Auth.currentUser;
    if (!user) {
        alert('Você precisa estar logado para se inscrever.');
        return;
    }

    const uid = user.uid;

    // Busca dados do usuário
    Database.ref("users/" + uid).once("value")
        .then(snapshot => {
            const userData = snapshot.val();

            if (!userData || !userData.userId || !userData.userClass || !userData.userCourse) {
                alert("⚠️ Antes de se inscrever, preencha suas informações pessoais (RA, Turma e Curso).");
                throw new Error("Dados pessoais incompletos");
            }

            if (userData.able === false) {
                alert("Você está suspenso e não pode se inscrever em eventos.");
                throw new Error("Usuário bloqueado");
            }

            // Busca dados do evento
            return Database.ref("event/" + eventId).once("value")
                .then(eventoSnap => {
                    const evento = eventoSnap.val();
                    if (!evento) {
                        alert("Evento não encontrado.");
                        throw new Error("Evento inexistente");
                    }

                    // Verifica pontuação mínima para eventos médios
                    if (evento.dificuldade === "Médio (acampas)") {
                        const pontos = parseFloat(userData.pontos) || 0;
                        if (pontos < 50) {
                            alert("⚠️ Você precisa de pelo menos 50 pontos para participar deste evento.");
                            throw new Error("Pontuação insuficiente");
                        }
                    }

                    return { evento, userData };
                });
        })
        .then(() => {
            // Registra inscrição
            const dataInscricao = Date.now();
            return Database.ref(`inscricoes/${eventId}/${uid}`).set({
                dataInscricao: dataInscricao,
                presenca: false
            });
        })
        .then(() => {
            alert('Inscrição realizada com sucesso!');
            subscribeBtn.style.display = 'none';
            unsubscribeBtn.style.display = 'inline-block';
        })
        .catch(error => {
            if (!["Dados pessoais incompletos", "Usuário bloqueado", "Inscrição antes do horário", "Pontuação insuficiente"].includes(error.message)) {
                console.error('Erro ao inscrever:', error);
                alert('Erro ao realizar inscrição. Tente novamente.');
            }
        });
}

// função para cancelar inscrição
function unsubscribeFromEvent(eventId, unsubscribeBtn, subscribeBtn) {
    const user = Auth.currentUser;
    if (!user) {
        alert('Você precisa estar logado para cancelar a inscrição.');
        return;
    }

    const confirmar = confirm("Tem certeza que deseja cancelar sua inscrição?");
    if (!confirmar) return;

    const uid = user.uid;
    const inscricaoRef = Database.ref(`inscricoes/${eventId}/${uid}`);

    inscricaoRef.remove()
        .then(() => {
            alert('Inscrição removida com sucesso!');
            unsubscribeBtn.style.display = 'none';
            subscribeBtn.style.display = 'inline-block';
        })
        .catch(error => {
            console.error('Erro ao remover inscrição:', error);
            alert('Erro ao cancelar inscrição. Tente novamente.');
        });
}