// função para preencher a lista de eventos
import {Auth, Database} from "../config/firebase";
import {formattedDate, validarOrdemDatas} from "./date"
import {eventCount, getRefFromDatabase, hideItem, loading} from "./utils";
import {isAdmin} from "./auth";
import {exportarInscricoesCSV, fecharListaInscritos, listarInscritos, removeEvent, updateEvent} from "./eventAdmin";

/**
 * Preenche a lista de eventos com a data _(informações)_ dadas,
 * mostrando opções de administrador.
 * @param dataSnapshot informações dos eventos
 */
function fillEventListAsAdmin(dataSnapshot) {
    const eventContainer = document.getElementById('eventContainer');
    eventContainer.innerHTML = '';

    const events = dataSnapshot.size;
    eventCount.innerHTML = 'Total de eventos: ' + events;

    const user = Auth.currentUser;

    // função async para pegar a role do usuário logado
    async function getUserRole(uid) {
        const snap = await Database.ref('users/' + uid + '/role').once('value');
        return snap.val();
    }

    getUserRole(user.uid).then(userRole => {
        const isAdmin = userRole === 'admin';

        // Transforma snapshot em array para ordenar
        const eventsArray = [];
        dataSnapshot.forEach(item => {
            eventsArray.push({ key: item.key, value: item.val() });
        });

        // Ordena pelo campo dataInscricao (mais recente acima)
        eventsArray.sort((a, b) => {
            const tA = a.value.dataInscricao ? new Date(a.value.dataInscricao).getTime() : 0;
            const tB = b.value.dataInscricao ? new Date(b.value.dataInscricao).getTime() : 0;
            return tB - tA; // decrescente
        });

        // Cria os cards ordenados
        eventsArray.forEach(item => {
            const value = item.value;
            if (document.getElementById(item.key)) return;

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

            let [subscribeBtn, unsubscribeBtn] = createSubscribeButton(value, item.key, user.uid);

            if (isAdmin) {
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remover';
                removeBtn.className = 'danger eventBtn';
                removeBtn.onclick = () => removeEvent(item.key);

                const editBtn = document.createElement('button');
                editBtn.textContent = 'Editar';
                editBtn.className = 'alternative eventBtn';
                editBtn.onclick = () => updateEvent(item.key);

                const listarBtn = document.createElement('button');
                listarBtn.textContent = 'Listar Inscritos';
                listarBtn.className = 'alternative eventBtn';
                listarBtn.onclick = () => listarInscritos(item.key);

                const exportarCSV = document.createElement('button');
                exportarCSV.textContent = 'Baixar Planilha de Inscrições';
                exportarCSV.className = 'alternative eventBtn';
                exportarCSV.onclick = () => exportarInscricoesCSV(item.key, value.nome);

                eventCard.appendChild(removeBtn);
                eventCard.appendChild(editBtn);
                eventCard.appendChild(listarBtn);
                eventCard.appendChild(exportarCSV);
            }

            eventCard.appendChild(subscribeBtn);
            eventCard.appendChild(unsubscribeBtn);
            eventContainer.appendChild(eventCard);
        });

        hideItem(loading);
    }).catch(err => {
        console.error("Erro ao buscar role do usuário:", err);
        hideItem(loading);
    });
}

/**
 * Cria o botão de inscrever/desinscrever.
 * @param evento o evento em que se quer colocar o botão
 * @param key o uid do evento
 * @param userUid o uid do usuário
 * @return {HTMLButtonElement[]} os botões de inscrição/desinscrição
 */
function createSubscribeButton(evento, key, userUid) {
    const subscribeBtn = document.createElement('button');
    subscribeBtn.textContent = 'Inscrever-se';
    subscribeBtn.className = 'primary eventBtn';
    subscribeBtn.disabled = true; // começa desativado
    subscribeBtn.style.backgroundColor = '#ccc';
    subscribeBtn.style.cursor = 'not-allowed';

    // pega a hora do evento
    const eventStart = evento.dataInscricao ? new Date(evento.dataInscricao) : null;
    const eventDate = evento.data ? new Date(evento.data) : null;

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
    Database.ref('inscricoes/' + key + '/' + userUid)
        .once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                subscribeBtn.style.display = 'none';
                unsubscribeBtn.style.display = 'inline-block';

                // checa se a data do evento já passou
                const eventDate = evento.data ? new Date(evento.data) : null;
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
        const eventStart = new Date(evento.dataInscricao);

        //camada extra de segurança
        if (Date.now() < eventStart.getTime()) {
            alert("⚠️ Inscrições ainda não começaram para este evento.");
            return;
        }

        subscribeToEvent(key, subscribeBtn, unsubscribeBtn);
    };

    unsubscribeBtn.onclick = () => {
        unsubscribeFromEvent(key, unsubscribeBtn, subscribeBtn);
        fecharListaInscritos();
    };

    return [subscribeBtn, unsubscribeBtn];
}

/**
 * Preenche a lista de eventos com a data _(informações)_ dadas,
 * mostrando opções apenas de usuários.
 * @param dataSnapshot informações dos eventos
 */
function fillEventListAsUser(dataSnapshot) {
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
        .then(_userSnapshot => {
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

                // Cria o botão de inscrever e desinscrever
                let [subscribeBtn, unsubscribeBtn] = createSubscribeButton(value, item.key, uid);

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

/**
 * Preenche os eventos com a data _(informações)_ dadas.
 * @param dataSnapshot informações dos eventos
 */
export function fillEventList(dataSnapshot) {
    if (isAdmin()) fillEventListAsAdmin(dataSnapshot, Auth.currentUser)
    else fillEventListAsUser(dataSnapshot, Auth.currentUser)
}

/**
 * Calcula a pontuação do evento dado a partir do Fator K.
 * @param evento evento que se deseja calcular a pontuação
 * @return {number} pontuação do evento dado.
 */
export function calcularPontuacaoDoEvento(evento) {
    const distancia = parseFloat(evento.distancia) || 0;
    const subida = parseFloat(evento.subida) || 0;
    const descida = parseFloat(evento.descida) || 0;

    // Fator K
    const fatorK = 1 + ((subida + descida) / 1000);
    return Math.round(distancia * fatorK);
}

// função para atualizar pontos usando fator K
export async function atualizarPontuacaoUsuario(uid, eventId, adicionar) {
    try {
        const eventSnap = await Database.ref("event/" + eventId).once("value");
        const evento = eventSnap.val();

        if (!evento) {
            console.error("Evento não encontrado:", eventId);
            return;
        }

        const pontuacaoEvento = calcularPontuacaoDoEvento(evento);
        if (pontuacaoEvento <= 0) {
            console.warn(`Pontuação inválida (${pontuacaoEvento}) para evento ${eventId}`);
            return;
        }

        // Busca pontos atuais do usuário
        const userRef = Database.ref("users/" + uid);
        const userSnap = await userRef.once("value");
        const userData = userSnap.val() || {};

        const pontosAtuais = parseFloat(userData.pontos) || 0;
        const novosPontos = adicionar
            ? pontosAtuais + pontuacaoEvento   // soma se presente
            : Math.max(0, pontosAtuais - pontuacaoEvento); // remove se ausente

        // Atualiza no BD
        await userRef.update({ pontos: novosPontos });
    } catch (err) {
        console.error("Erro ao atualizar pontuação:", err);
    }
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
async function unsubscribeFromEvent(eventId, unsubscribeBtn, subscribeBtn) {
    const user = Auth.currentUser;
    if (!user) {
        alert('Você precisa estar logado para cancelar a inscrição.');
        return;
    }

    const confirmar = confirm("Tem certeza que deseja cancelar sua inscrição?");
    if (!confirmar) return;

    const uid = user.uid;

    const inscricaoRef = Database.ref(`inscricoes/${eventId}/${uid}`);

    // Se não encontrou a inscrição, retorna
    if (!inscricaoRef) return;

    // Retira a pontuação desse evento do usuário
    await atualizarPontuacaoUsuario(uid, eventId, false);

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


