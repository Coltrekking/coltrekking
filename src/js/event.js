// função para preencher a lista de eventos
import {Auth} from "../config/firebase";
import {formattedDate} from "./date"
import {
    EventsDatabaseRef,
    getAttributeFromUser,
    getDataFromDatabase,
    getDataFromUser,
    hideItem,
    InscricoesDatabaseRef,
    loading,
    PhotosDatabaseRef,
    refFromDatabase,
    refFromUser, showItem, showLoading
} from "./utils";
import {abrirAlerta, abrirConfirmacao, abrirModal, EntradasModal} from "./modal";
import {isAdmin} from "./auth";
import {exportarInscricoesCSV, exportarInscricoesXLSX, listarInscritos, removeEvent, updateEvent} from "./eventAdmin";
import {remove, set, update} from "firebase/database";
import {enviarErroParaSentry} from "/src/js/main";

// Ícones para as ações relacionadas às imagens dos eventos
// (o ícone que aperta para abrir a tela de imagens)
const EventImagesIcons = {
    "add": "/assets/icons/add-image-icon.svg",
    "view": "/assets/icons/image-icon.svg"
}

/**
 * Retorna a quantidade mínima de pontos para se inscrever
 * no evento dado.
 * @param eventoId id do evento
 * @return {number} pontuação mínima necessária para se inscrever no evento dado.
 */
export async function getPontuacaoMinimaParaEvento(eventoId) {
    const snap = await getDataFromDatabase(EventsDatabaseRef, eventoId);
    // Verifica se o snap existe
    if (snap && snap.exists() && snap.val().pontuacaoNecessaria !== null) {
        // Verifica se há uma dificuldade definida
        if (snap.val().pontuacaoNecessaria === null || snap.val().pontuacaoNecessaria === undefined) return 0; // dificuldade padrão

        // Retorna a pontuação necessária definida para o evento
        return snap.val().pontuacaoNecessaria;
    }
}

/**
 * Verifica a dificuldade do evento. Se o usuário não tiver a pontuação
 * que precisa para participar do evento, mostra um aviso para ele.
 * @param userUid UID do usuário
 * @param pontuacaoNecessaria pontuação necessária para participar do evento
 * @param eventDate data do evento, para mostrar o aviso apenas se o evento ainda não tiver acontecido
 * @param eventCard elemento eventCard do evento, para mostrar o aviso
 */
function checkForDifficult(userUid, pontuacaoNecessaria, eventDate, eventCard) {
    getAttributeFromUser(userUid, "pontos").then(pontuacaoUsuario => {
        // Se não tiver pontos suficientes, mostra um aviso.
        if (pontuacaoUsuario < pontuacaoNecessaria) {
            if (eventDate && Date.now() > eventDate.getTime()) return; // se o evento já passou, não mostra aviso

            // Cria elemento de aviso em vez de usar innerHTML +=
            const avisoElem = document.createElement('p');
            avisoElem.className = 'soft-warn';
            avisoElem.textContent = `Você precisa de ${pontuacaoNecessaria} pontos para participar deste evento!`;
            eventCard.appendChild(avisoElem);
        }
    });
}

/**
 * Preenche um card de evento com as informações dadas.
 * @param eventContainer o container onde o cartão deve ficar
 * @param item o item do evento, com a chave e o valor (informações do evento)
 * @param uid o uid do usuário
 * @param updating se está atualizando um cartão. Se estiver, ele *não* vai criar um novo cartão.
 */
function fillEventCard(eventContainer, item, uid, updating = false) {
    const value = item.value;
    if (!updating && document.getElementById(item.key)) return; // evita duplicação

    let eventCard = null;
    if (updating) { // Se estiver atualizando, tenta obter o cartão
        eventCard = document.getElementById(item.key);
        if (eventCard) eventCard.replaceChildren(); // limpa o cartão para preencher com as informações atualizadas
    }
    if (!eventCard) { // Se o cartão não existir, cria um novo
        eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        eventCard.style.position = "relative";
        eventCard.id = item.key;
    }

    // Cria e estiliza o botão de ver as imagens do evento
    const seeImagesBtn = document.createElement("button");
    seeImagesBtn.id = `evento-imagens-${item.key}`;
    seeImagesBtn.title = "Imagens";
    seeImagesBtn.className = "icon-button";
    seeImagesBtn.style.position = "absolute";
    seeImagesBtn.style.right = "15px";
    seeImagesBtn.style.zIndex = "3";

    const seeImagesImg = document.createElement("img");
    seeImagesImg.id = "evento-imagens-img-" + item.key;
    seeImagesImg.src = EventImagesIcons.view;
    seeImagesImg.alt = "Fotos";
    seeImagesImg.className = "icon";
    seeImagesImg.style.height = "2.5em";

    if (!seeImagesImg.parentElement)
        seeImagesBtn.appendChild(seeImagesImg);
    if (!seeImagesBtn.parentElement)
        eventCard.appendChild(seeImagesBtn);

    // Esconde o botão se não houver fotos (ou, se for admin,
    // troca para algo que indique para adicionar uma foto)
    getEventPhotos(item.key).then(links => {
        if (links.length === 0) {
            // Se o usuário não for admin, não mostra o botão
            if (!isAdmin()) {
                seeImagesBtn.style.display = "none";
                eventCard.removeChild(seeImagesBtn);
            } else { // Se for admin, troca para a foto de adicionar imagem
                seeImagesImg.src = EventImagesIcons.add;
            }
        }
    });

    // Coloca as informações do evento
    eventCard.insertAdjacentHTML('beforeend', `
                    <h3 class="event-title">${value.nome}</h3>
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
                `);

    /* inserir altimentria depois (precisa do cloud storage)
    <p>Altimetria:<br>
        ${value.percursoAltimetria
        ? `<img src="${value.percursoAltimetria}" alt="altimetria" style="max-width: 100%;">`
        : '---'}
    </p>
    */

    // Se o usuário for admin, mostra os botões de admin
    if (isAdmin()) {
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
        exportarCSV.onclick = () => {
            // Pergunta ao usuário o formato para exportar
            abrirModal(
                "Exportar Inscrições",
                "Deseja exportar em qual formato?",
                EntradasModal.SELECAO,
                {opcoes:
                        {"xlsx": "Excel/Google Planilhas (.xlsx)", "csv": "CSV (.csv)"}
                }
            ).then(resultado => {
                if (resultado) {
                    switch (resultado) {
                        case "csv":
                            exportarInscricoesCSV(item.key, value.nome);
                            break;
                        case "xlsx":
                            exportarInscricoesXLSX(item.key, value.nome);
                            break;
                    }
                }
            });
        }

        eventCard.appendChild(removeBtn);
        eventCard.appendChild(editBtn);
        eventCard.appendChild(listarBtn);
        eventCard.appendChild(exportarCSV);
    }

    // Cria o botão de inscrever e desinscrever
    const eventDate = value.data ? new Date(value.data) : null;
    let [subscribeBtn, unsubscribeBtn] = createSubscribeButton(value, item.key, uid, eventDate);
    eventCard.appendChild(subscribeBtn);
    eventCard.appendChild(unsubscribeBtn);

    // Verifica a dificuldade (para mostrar o aviso se precisar)
    let pontuacaoNecessaria = value.pontuacaoNecessaria;
    if (pontuacaoNecessaria === null || pontuacaoNecessaria === undefined) pontuacaoNecessaria = 0; // dificuldade padrão
    checkForDifficult(uid, pontuacaoNecessaria, eventDate, eventCard);

    // Conecta o botão de imagens com a função de apresentar as fotos
    seeImagesBtn.addEventListener('click', _ => {
        showEventPhotos(value.nome, item.key).then(_ => { });
    });

    if (!eventCard.parentElement)
        eventContainer.appendChild(eventCard);
}

/**
 * Atualiza o card do evento com o id dado.
 * @param eventId id do evento
 */
function updateEventCard(eventId) {
    const eventContainer = document.getElementById('eventContainer');

    // Obtém as informações
    getDataFromDatabase(EventsDatabaseRef, eventId).then(snapshot => {
        const data = snapshot.val();
        if (!data) // Se não encontrou as informações do evento, lança um erro
            throw new Error(`Evento com id ${eventId} não encontrado para atualizar o card.`);

        // Cria um novo card com as informações atualizadas
        /*const newEventCard = document.createElement('div');
        newEventCard.className = 'event-card';
        newEventCard.style.position = "relative";
        newEventCard.id = eventId;*/

        // Preenche o novo card com as informações atualizadas
        fillEventCard(eventContainer, {key: eventId, value: data}, localStorage.getItem('uid'), true);
    }).catch(err => {
        enviarErroParaSentry(err);
    });
}

/**
 * Cria e preenche os elementos do container de eventos em comum entre o homePage
 * de usuário e o de admin.
 * @param dataSnapshot snapshot dos eventos
 */
function fillEventContainer(dataSnapshot) {
    if (!Auth.currentUser) return;
    // Obtém o uid do usuário local
    const uid = localStorage.getItem('uid');
    if (!uid) {
        // Isso só acontece se o usuário (na maioria das vezes) porque o usuário
        // está com o email inválido. Nesse caso, só retorna.
        /*console.warn('UID não encontrado no localStorage.');
        enviarErroParaSentry("UID não foi encontrado no localStorage. Por isso, os eventos não serão carregados.");
        hideItem(loading);
        abrirAlerta("Reinicie a página.");*/
        return;
    }

    // Começa a criar e preencher //

    const eventContainer = document.getElementById('eventContainer');
    const eventCount = document.getElementById('eventCount');
    eventContainer.innerHTML = ''; // limpa container
    eventCount.innerHTML = 'Carregando eventos...';

    // Transforma o snapshot em um array e ordena //

    const eventosArray = [];
    dataSnapshot.forEach(item => {
        eventosArray.push({ key: item.key, value: item.val() });
    });

    eventosArray.sort((a, b) => {
        const tA = a.value.dataInscricao ? new Date(a.value.dataInscricao).getTime() : 0;
        const tB = b.value.dataInscricao ? new Date(b.value.dataInscricao).getTime() : 0;
        return tB - tA; // mais recente primeiro
    });

    eventCount.innerHTML = 'Total de eventos: ' + eventosArray.length;

    // Preenche os cards dos eventos
    eventosArray.forEach(item => {
        fillEventCard(eventContainer, item, uid);
    });
}

/**
 * Preenche a lista de eventos com a data _(informações)_ dadas,
 * mostrando opções de administrador.
 * @param dataSnapshot informações dos eventos
 */
function fillEventListAsAdmin(dataSnapshot) {
    // Preenche o container de eventos
    fillEventContainer(dataSnapshot)
}


// Estados do botão de inscrição/desinscrição
const SubscribeButtonStates = Object.freeze({  // O `Object.freeze()` certifica que não é possível atualizar
    INSCREVER: 'Inscrever',
    DESINSCREVER: 'Desinscrever',
    EVENTO_REALIZADO: 'eventoRealizado',
    NAO_HABILITADO: 'naoHabilitado'
    // Lembre-se: se adicionar um novo estado, atualize a função setSubscribeButtonState() para refletir o estado visual do botão
});
/**
 * Define o estado do botão de inscrição/desinscrição a partir do estado dado.
 * @param button o elemento do botão a ser modificado
 * @param state estado do botão, dado pelos estados do SubscribeButtonStates
 */
function setSubscribeButtonState(button, state) {
    if (!button)
        throw new Error("Botão dado para definir o estado é inválido!")
    switch (state) {
        case SubscribeButtonStates.INSCREVER: {
            button.textContent = 'Inscrever-se';
            button.className = 'primary eventBtn';
            //button.style.backgroundColor = '#ccc';
            button.style.backgroundColor = '';
            button.style.cursor = 'pointer';
            button.disabled = false;
            break;
        }
        case SubscribeButtonStates.DESINSCREVER: {
            button.textContent = 'Cancelar inscrição';
            button.className = 'danger eventBtn';
            button.style.display = 'none';
            break;
        }
        case SubscribeButtonStates.EVENTO_REALIZADO: {
            button.style.backgroundColor = '#008000';
            button.textContent = 'Evento realizado';
            button.disabled = true;
            button.style.cursor = 'not-allowed';
            break;
        }

        case SubscribeButtonStates.NAO_HABILITADO: {
            button.style.backgroundColor = '#ccc';
            button.disabled = true;
            button.style.cursor = 'not-allowed';
            break;
        }
    }
}

/**
 * Cria o botão de inscrever/desinscrever.
 * @param evento o evento em que se quer colocar o botão
 * @param key o uid do evento
 * @param userUid o uid do usuário
 * @param eventDate data do evento
 * @return {HTMLButtonElement[]} os botões de inscrição/desinscrição
 */
function createSubscribeButton(evento, key, userUid, eventDate) {
    const subscribeBtn = document.createElement('button');
    subscribeBtn.id = `subscribeBtn-${key}`;
    setSubscribeButtonState(subscribeBtn, SubscribeButtonStates.INSCREVER);
    subscribeBtn.disabled = true; // começa desativado
    subscribeBtn.style.cursor = 'not-allowed';

    // pega a hora do evento
    const eventStart = evento.dataInscricao ? new Date(evento.dataInscricao) : null;


    // verifica se já é hora de inscrição e se ainda não passou a data do evento
    function checkSubscriptionTime() {
        if (!eventStart) return;

        const now = Date.now();

        // se ainda não chegou a hora de inscrição
        if (now < eventStart.getTime()) {
            setSubscribeButtonState(subscribeBtn, SubscribeButtonStates.NAO_HABILITADO);
            return;
        }

        // se a data do evento já passou
        if (eventDate && now > eventDate.getTime()) {
            setSubscribeButtonState(subscribeBtn, SubscribeButtonStates.EVENTO_REALIZADO);
            clearInterval(subscriptionTimer);
            return;
        }

        // se está no período válido de inscrição
        setSubscribeButtonState(subscribeBtn, SubscribeButtonStates.INSCREVER);
    }

    // chama a função a cada segundo até habilitar
    const subscriptionTimer = setInterval(checkSubscriptionTime, 100);
    checkSubscriptionTime(); // checa imediatamente

    const unsubscribeBtn = document.createElement('button');
    unsubscribeBtn.id = `unsubscribeBtn-${key}`;
    setSubscribeButtonState(unsubscribeBtn, SubscribeButtonStates.DESINSCREVER);

    // verifica se o usuário já está inscrito
    getDataFromDatabase(InscricoesDatabaseRef, key + '/' + userUid)
        .then(snapshot => {
            if (snapshot.exists()) {
                subscribeBtn.style.display = 'none';
                unsubscribeBtn.style.display = 'inline-block';

                // checa se a data do evento já passou
                const eventDate = evento.data ? new Date(evento.data) : null;
                if (eventDate && Date.now() > eventDate.getTime()) {
                    setSubscribeButtonState(unsubscribeBtn, SubscribeButtonStates.EVENTO_REALIZADO);
                }
            }
        });

    // chama subscribe passando ambos os botões
    subscribeBtn.onclick = () => {
        const eventStart = new Date(evento.dataInscricao);

        //camada extra de segurança
        if (Date.now() < eventStart.getTime()) {
            abrirAlerta("⚠️ Inscrições ainda não começaram para este evento.").then( );
            return;
        }

        subscribeToEvent(key, subscribeBtn, unsubscribeBtn)
            .then( () => {
                if (isAdmin()) listarInscritos(key, true)
            } );
    };

    unsubscribeBtn.onclick = () => {
        unsubscribeFromEvent(key, unsubscribeBtn, subscribeBtn)
            .then( () => {
                if (isAdmin()) listarInscritos(key, true)
            } );
    };

    return [subscribeBtn, unsubscribeBtn];
}

/**
 * Preenche a lista de eventos com a data _(informações)_ dadas,
 * mostrando opções apenas de usuários.
 * @param dataSnapshot informações dos eventos
 */
function fillEventListAsUser(dataSnapshot) {
    // Preenche os elementos em comum
    fillEventContainer(dataSnapshot);
}

/**
 * Preenche os eventos com a data _(informações)_ dadas.
 * @param dataSnapshot informações dos eventos
 */
export function fillEventList(dataSnapshot) {
    // Isso aqui, atualmente, não é necessário, já que tanto o admin quanto o usuário comum tem a mesma visualização de eventos.
    // Mas, caso queira colocar algo específico para cada tipo de usuário, pode alterar na respectiva função.
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
        const eventSnap = await getDataFromDatabase(EventsDatabaseRef, eventId);
        const evento = eventSnap.val();

        if (!evento) {
            enviarErroParaSentry(new Error(`Evento nao encontrado com id: ${eventId}`));
            console.error("Evento não encontrado:", eventId);
            return;
        }

        const pontuacaoEvento = calcularPontuacaoDoEvento(evento);
        if (pontuacaoEvento <= 0) {
            console.warn(`Pontuação inválida (${pontuacaoEvento}) para evento ${eventId}`);
            return;
        }

        // Busca pontos atuais do usuário
        const userRef = refFromUser(uid);
        const userSnap = await getDataFromDatabase(userRef);
        const userData = userSnap.val() || {};

        const pontosAtuais = parseFloat(userData.pontos) || 0;
        const novosPontos = adicionar
            ? pontosAtuais + pontuacaoEvento   // soma se presente
            : Math.max(0, pontosAtuais - pontuacaoEvento); // remove se ausente

        // Atualiza no BD
        await update(userRef, { pontos: novosPontos });
    } catch (err) {
        console.error("Erro ao atualizar pontuação:", err);
        enviarErroParaSentry(err);
    }
}


// funcção para inscrever em evento
function subscribeToEvent(eventId, subscribeBtn, unsubscribeBtn) {
    const user = Auth.currentUser;
    if (!user) {
        abrirAlerta('Você precisa estar logado para se inscrever.').then( );
        return Promise.reject(new Error("Usuário não autenticado"));
    }

    const uid = user.uid;

    // Busca dados do usuário
    return getDataFromUser(uid)
        .then(snapshot => {
            const userData = snapshot.val();

            if (!userData || !userData.userId || !userData.userClass || !userData.userCourse) {
                abrirAlerta("⚠️ Antes de se inscrever, preencha suas informações pessoais (RA, Turma e Curso).").then( );
                throw new Error("Dados pessoais incompletos");
            }

            if (userData.able === false) {
                abrirAlerta("Você está suspenso e não pode se inscrever em eventos.").then( );
                throw new Error("Usuário bloqueado");
            }

            // Busca dados do evento
            return getDataFromDatabase(EventsDatabaseRef, eventId)
                .then(async eventoSnap => {
                    const evento = eventoSnap.val();
                    if (!evento) {
                        await abrirAlerta("Evento não encontrado.");
                        throw new Error("Evento inexistente");
                    }

                    // Verifica pontuação mínima para eventos médios
                    const pontos = parseFloat(userData.pontos) || 0;
                    const pontuacaoNecessaria = await getPontuacaoMinimaParaEvento(eventId);
                    if (pontos < pontuacaoNecessaria) {
                        await abrirAlerta(`⚠️ Você precisa de, pelo menos, ${pontuacaoNecessaria} pontos para participar deste evento.`);
                        throw new Error("Pontuação insuficiente");
                    }

                    return { evento, userData };
                });
        })
        .then(() => {
            // Registra inscrição
            const dataInscricao = Date.now();
            return set(refFromDatabase(InscricoesDatabaseRef, `${eventId}/${uid}`), {
                dataInscricao: dataInscricao,
                presenca: false
            });
        })
        .then(() => {
            abrirAlerta('Inscrição realizada com sucesso!');
            subscribeBtn.style.display = 'none';
            unsubscribeBtn.style.display = 'inline-block';
        })
        .catch(error => {
            if (!["Dados pessoais incompletos", "Usuário bloqueado", "Inscrição antes do horário", "Pontuação insuficiente"].includes(error.message)) {
                console.error('Erro ao inscrever:', error);
                enviarErroParaSentry(error);
                abrirAlerta('Erro ao realizar inscrição. Tente novamente.');
            }
        });
}

// função para cancelar inscrição
async function unsubscribeFromEvent(eventId, unsubscribeBtn, subscribeBtn) {
    const confirmar = await abrirConfirmacao("Tem certeza que deseja cancelar sua inscrição?");
    if (!confirmar) return;

    const user = Auth.currentUser;
    if (!user) {
        await abrirAlerta('Você precisa estar logado para cancelar a inscrição.');
        return;
    }

    const uid = user.uid;

    // Mostra o loading enquanto processa a retirada do usuário do evento
    showItem(loading);

    // Retira o usuário do evento
    unsubscribeUserFromEvent(eventId, uid).then(() => {
        abrirAlerta('Inscrição removida com sucesso!');
        unsubscribeBtn.style.display = 'none';
        subscribeBtn.style.display = 'inline-block';
    }).finally(_ => {
        hideItem(loading);
    });
}

export async function unsubscribeUserFromEvent(eventId, uid) {
    const user = await getDataFromUser(uid);

    const inscricaoRef = refFromDatabase(InscricoesDatabaseRef, `${eventId}/${uid}`);

    // Se não encontrou a inscrição, retorna
    if (!inscricaoRef) return;

    // Retira a pontuação desse evento do usuário
    await atualizarPontuacaoUsuario(uid, eventId, false);

    // Remove a inscrição do usuário
    return remove(inscricaoRef)
        .then(async () => {
            // Verifica os eventos que o usuário está inscrito para checar
            // se, em algum deles, ele não tem mais ponto suficiente para participar.
            await checkSubscribedEventsRequiringMinimumPoints(uid);
        })
        .catch(error => {
            console.error(`Erro ao remover inscrição do usuário ${user.val().nome}:`, error);
            enviarErroParaSentry(error);
            abrirAlerta('Erro ao cancelar inscrição. Tente novamente.');
        });
}

/**
 * Verifica os eventos que o usuário do uid dado está inscrito
 * e retira ele dos eventos que ele não está mais.
 * @param uid uid do usuário que deseja atualizar
 */
export async function checkSubscribedEventsRequiringMinimumPoints(uid) {
    // Obtém os eventos existentes
    const eventsSnapshot = await getDataFromDatabase(EventsDatabaseRef);
    if (!eventsSnapshot || !eventsSnapshot.exists())
        throw new Error("Não foi possível obter a lista de eventos");

    // Obtém os snaps dos eventos (preciso fazer isso pois o forEach
    // não aceita comportamento assíncrono)
    const events = [];
    eventsSnapshot.forEach(snap => {
        events.push(snap);
    })

    // Olha cada evento, vendo se necessita de ponto para estar nele
    // e o usuário está nele
    const verifications = events.map(async eventSnap => {
        const eventId = eventSnap.key;
        const event = eventSnap.val();
        const pontuacaoNecessaria = event.pontuacaoNecessaria;

        // Se não houver pontuação necessária, não tem motivo para olhar mais
        if (pontuacaoNecessaria === 0) return;

        // Verifica se o usuário está inscrito no evento
        const userSubscribed = await isUserSubscribedInEvent(uid, eventId);
        if (userSubscribed) {
            // Se o usuário estiver presente no evento, a pontuação do evento deve ser descontada
            const pontuacaoDoEvento =  calcularPontuacaoDoEvento(event) * ( (await isUserPresentInEvent(uid, eventId) ) ? 1 : 0);
            const pontuacaoUsuario = (await getAttributeFromUser(uid, 'pontos')) - pontuacaoDoEvento;

            // Se o usuário tiver menos pontos que o necessário, retira ele
            if (pontuacaoUsuario < pontuacaoNecessaria) {
                await unsubscribeUserFromEvent(eventId, uid);

                // Se o usuário que foi retirado for o usuário atual, atualiza os botões de inscrever/desinscrever
                if (uid === Auth.currentUser.uid) {
                    const inscreverBtn = document.getElementById(`subscribeBtn-${eventId}`);
                    inscreverBtn.style.display = "inline-block";

                    const desinscreverBtn = document.getElementById(`unsubscribeBtn-${eventId}`);
                    hideItem(desinscreverBtn);
                }
            }
        }
    })

    // Espera todas as verificações
    await Promise.all(verifications);
}

/**
 * Verifica se o usuário do uid dado está inscrito no evento do id dado.
 * @param {String} userUid uid do usuário
 * @param {String} eventId id do evento
 * @return {Boolean} se o usuário está ou não inscrito no evento
 */
async function isUserSubscribedInEvent(userUid, eventId) {
    const inscricaoEvento = await getDataFromDatabase(InscricoesDatabaseRef, eventId + '/' + userUid);

    // Se esse campo existe, o usuário está inscrito.
    return inscricaoEvento && inscricaoEvento.exists();
}

/**
 * Verifica se o usuário do uid dado está inscrito e presente no evento do id dado.
 * @param {String} userUid uid do usuário
 * @param {String} eventId id do evento
 * @return {Boolean} se o usuário está ou não presente e inscrito no evento
 */
async function isUserPresentInEvent(userUid, eventId) {
    const inscricaoEvento = await getDataFromDatabase(InscricoesDatabaseRef, eventId + '/' + userUid);

    // Verifica se está inscrito
    if (inscricaoEvento && inscricaoEvento.exists()) {
        // Verifica se setá presente
        return inscricaoEvento.val().presenca === true;
    }

    // Se chegou até aqui, o usuário não está inscrito ou não está presente
    return false;
}

/**
 * Adiciona o link dado à lista de fotos do evento.
 * @param {String} eventId id do evento
 * @param {String} link link para as fotos
 */
function _addLinkToPhotoList(eventId, link) {
    const photosContainer = document.getElementById("eventPhotoList");

    // Cria um elemento p e, dentro dele, um a com o link para a foto
    const pEl = document.createElement("p");
    const aEl = document.createElement("a");

    let displayLink = link;

    if (link.startsWith("https://"))
        displayLink = link.slice(8);
    else if (link.startsWith("http://"))
        displayLink = link.slice(7);
    else {
        // Se o link não começa com "http" ou "https", adiciona, automaticamente, isso.
        // NOTA: sem isso, o link levaria para uma sub-página da página do coltrekking
        // (tipo coltrekking.web.app/bit.ly/dj8ds292k, considerando que o link é
        // `bit.ly/dj8ds292k`
        link = link.padStart(link.length + 8, "https://")
    }

    aEl.href = link;
    aEl.innerText = displayLink;
    aEl.target = "_blank";

    pEl.appendChild(aEl);

    // Se for admin, cria um botão de lixeira para poder apagar o link
    if (isAdmin()) {
        const removeBtn = document.createElement("button");
        removeBtn.title = "Remover Imagem";
        removeBtn.className = "danger icon-button remove-img-btn";

        const removeImg = document.createElement("img");
        removeImg.src = "/assets/icons/delete-icon.svg";
        removeImg.alt = "Fotos";
        removeImg.className = "icon";

        removeBtn.onclick = () => {
            removeBtn.disabled = true; // Evita múltiplos cliques enquanto processa a remoção
            removeLink(eventId, link).then(_ => {
                photosContainer.removeChild(pEl); // Remove o elemento da lista de fotos (atualizar visualmente)
            })
        }

        removeBtn.appendChild(removeImg);
        pEl.appendChild(removeBtn);
    }

    photosContainer.appendChild(pEl);
    const mensagem = document.getElementById("noImagePhotoModal");
    hideItem(mensagem);
}


/**
 * Carrega e mostra as fotos do evento dado.
 * @param {String} eventName nome do evento que será apresentado no título do modal
 * @param {String} eventId id do evento que as fotos serão apresentadas
 */
async function showEventPhotos(eventName, eventId) {
    showLoading();
    const photosContainer = document.getElementById("eventPhotoList");
    const eventoSemFotoMensagem = document.getElementById("noImagePhotoModal");

    // Limpa o que tinha no modal e tira a mensagem de evento sem foto
    photosContainer.replaceChildren();
    hideItem(eventoSemFotoMensagem);

    // Obtém os links e lista eles //

    // Mostra o título dos eventos
    const tituloFotos = document.createElement("h3");
    tituloFotos.textContent = `${eventName}`;
    photosContainer.appendChild(tituloFotos);

    // Obtém os links
    const links = await getEventPhotos(eventId);

    // Se não tiver nenhum link, mostra uma mensagem de que não tem fotos
    if (links.length === 0) {

        showItem(eventoSemFotoMensagem);

    } else { // Se houver imagens

        const pSubtitulo = document.createElement("p");
        pSubtitulo.id = "photoLinksSubtitle";
        pSubtitulo.textContent = "Link das fotos:";
        photosContainer.appendChild(pSubtitulo);

        // Lista cada link
        links.forEach(link => {
            _addLinkToPhotoList(eventId, link);
        });
    }

    // Se for admin, cria um botão para adicionar uma nova imagem
    if (isAdmin()) {
        const btnAddImg = document.getElementById("addPhotoModalBtn");

        if (btnAddImg)
            btnAddImg.onclick = _ => {
            askForPhotoForEvent(eventId);
        };
    }

    hideItem(loading);
    // Deixa o conteúdo visível agora que terminou de carregar as fotos
    document.getElementById("modalOverlayFotosEvento").style.display = "flex";
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

/**
 * Pergunta ao usuário pela foto que ele deseja colocar no evento dado.
 * @param eventId evento que será adicionada a foto.
 */
async function askForPhotoForEvent(eventId) {
    if (!isAdmin()) return; // se não for admin, ignora
    // Pergunta ao usuário o link
    const url = await abrirModal(
        "Adicionar Imagens",
        "Digite o link das fotos",
        EntradasModal.TEXTO,
        {
            BtnOkTexto: "Adicionar"
        });

    // Verifica se realmente houve respota
    if (url) {
        addLink(eventId, url);
        _addLinkToPhotoList(eventId, String(url));
    }
}

/**
 * Adiciona o link dado às fotos do evento dado.
 * @param eventKey id do evento
 * @param url link das fotos
 */
function addLink(eventKey, url) {
    if (!isAdmin()) return;

    if (!eventKey || !url) {
        abrirAlerta('Selecione o evento e informe o link.');
        return;
    }

    getDataFromDatabase(PhotosDatabaseRef, eventKey).then(snapshot => {
        const links = snapshot.val() || [];
        links.push(url);

        set(refFromDatabase(PhotosDatabaseRef, eventKey), links)
            .then(() => {
                updateEventCard(eventKey);
            });
    });
}

/**
 * Remove o link (com o índice dado) das fotos do evento dado
 * @param eventKey id do evento
 * @param url link para remover
 * @return {Promise} promessa que resolve quando o link for removido do banco de dados
 */
async function removeLink(eventKey, url) {
    if (!isAdmin()) return false;
    if (! (await abrirConfirmacao('Deseja remover este link?'))) return false;

    return getDataFromDatabase(PhotosDatabaseRef, eventKey).then(async snapshot => {
        const links = snapshot.val() || [];
        links.splice(links.indexOf(url), 1);

        await set(refFromDatabase(PhotosDatabaseRef, eventKey), links)
            .then(async () => {
                // Obtém a lista de eventos e verifica se está vazia. Se tiver,
                // mostra a mensagem indicando que não há fotos.
                await getEventPhotos(eventKey).then(links => {
                    if (links.length <= 0) {
                        // Aparece a mensagem de vazia
                        const mensagem = document.getElementById("noImagePhotoModal");
                        showItem(mensagem);
                        // Desaparece o subtítulo dos links
                        const subtitulo = document.getElementById("photoLinksSubtitle");
                        if (subtitulo) hideItem(subtitulo);
                    }
                   updateEventCard(eventKey);
                });
            });
    });
}