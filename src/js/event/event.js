// função para preencher a lista de eventos
import {Auth} from "../../config/firebase";
import {formattedDate} from "../date"
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
    refFromUser, showItem, showItemAsFlex, showLoading,
    getRealTime, hideLoading, delay
} from "../utils";
import {abrirAlerta, abrirConfirmacao, abrirModal, EntradasModal} from "../modal";
import {isAdmin} from "../auth";
import {listarInscritos, removeEvent, updateEvent} from "./eventAdmin";
import {remove, set, update, serverTimestamp} from "firebase/database";
import {enviarErroParaSentry} from "/src/js/main";
import {
    createEventCard, fillEventModal, getEventElementId, getEventPhotos, setEventFunctions, setSubscribeButtons,
    setSubscribeButtonState, SubscribeButtonStates
} from "./eventUI";

export const modalInscricaoEvento = document.getElementById("modalOverlayInscricaoEvento");

// Ícones para as ações relacionadas às imagens dos eventos
// (o ícone que aperta para abrir a tela de imagens)
const EventImagesIcons = {
    "add": "/assets/icons/add-image-icon.svg",
    "view": "/assets/icons/image-icon.svg",
    "no_image": "/assets/icons/no-image-icon.svg"
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
 * Atualiza o card do evento com o id dado.
 * @param eventId id do evento
 */
export function updateEventCard(eventId) {
    const eventContainer = document.getElementById('eventContainer');

    // Obtém as informações
    getDataFromDatabase(EventsDatabaseRef, eventId).then(snapshot => {
        const data = snapshot.val();
        if (!data) // Se não encontrou as informações do evento, lança um erro
            throw new Error(`Evento com id ${eventId} não encontrado para atualizar o card.`);

        // Preenche os cards com as informações atualizadas
        createEventCard({ key: snapshot.key, value: data }, eventContainer);
        fillEventModal(eventId, data);
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
        // está com o email inválido. Nesse caso, só retornar é suficiente.

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
        createEventCard(item, eventContainer);
    });
}

/**
 * Preenche a lista de eventos com a data _(informações)_ dadas,
 * mostrando opções de administrador.
 * @param dataSnapshot informações dos eventos
 */
function fillEventListAsAdmin(dataSnapshot) {
    // Preenche o container de eventos
    fillEventContainer(dataSnapshot);
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

// Tempo mínimo, em milissegundos, entre tentativas de inscrições (para evitar
// que um usuário fique clicando muitas vezes no botão e dê conflito)
const minimumTimeBetweenSubscriptionAttempts = 1500;

let lastSubscriptionTime = -1;
// funcção para inscrever em evento
function subscribeToEvent(eventId, subscribeBtn, unsubscribeBtn, alreadyRetrying = false) {
    // Verifica se já deu o tempo mínimo desde a última tentativa
    if ( lastSubscriptionTime >= 0 && (getRealTime() - lastSubscriptionTime) < minimumTimeBetweenSubscriptionAttempts )
        return;

    const user = Auth.currentUser;
    if (!user) {
        abrirAlerta('Você precisa estar logado para se inscrever.').then( );
        return Promise.reject(new Error("Usuário não autenticado"));
    }

    const uid = user.uid;

    // Atualiza o tempo da última tentativa de inscrição
    lastSubscriptionTime = getRealTime();

    showLoading();

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

                    // Bloqueia inscrições antes da hora
                    const eventStart = new Date(evento.dataInscricao).getTime();
                    if (getRealTime() < eventStart) {
                        await abrirAlerta("⚠️ Inscrições ainda não começaram para este evento.");
                        throw new Error("Inscrição antes do horário");
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
        .then(async () => {
            // Registra inscrição (usando transações) //
            await set(refFromDatabase(InscricoesDatabaseRef, `${eventId}/${uid}`), {
                dataInscricao: serverTimestamp(),
                presenca: false
            });
            // Se chegou até aqui, deu tudo certo na inscrição chama a função de sucesso.
            // NOTA: não é usado "await" aqui pq não tem motivos de esperar (essa função tem efeito puramente visual).
            onSuccessfulSubscription(eventId).then( );
            setSubscribeButtons(true, subscribeBtn, unsubscribeBtn);

            // Botões do card de evento
            const cardSubscribeBtn = document.getElementById(getEventElementId('inscrever-btn', eventId));
            const cardUnsubscribeBtn = document.getElementById(getEventElementId('cancelar-inscricao-btn', eventId));
            setSubscribeButtons(true, cardSubscribeBtn, cardUnsubscribeBtn);

            hideLoading(); // Some o loading que foi colocado logo antes
        })
        .then(async () => {
            //abrirAlerta('Inscrição realizada com sucesso!');
        })
        .catch(error => {
            hideLoading();
            if (!["Dados pessoais incompletos", "Usuário bloqueado", "Inscrição antes do horário", "Pontuação insuficiente"].includes(error.message)) {
                // Tenta se inscrever novamente se não conseguiu de primeira
                if (!alreadyRetrying) {
                    enviarErroParaSentry(error);
                    subscribeToEvent(eventId, subscribeBtn, unsubscribeBtn, true);
                // Se já tentou se inscrever duas vezes, apenas envia o erro
                } else {
                    console.error('Erro ao inscrever:', error);
                    enviarErroParaSentry(error);
                    abrirAlerta('Erro ao realizar inscrição. Tente novamente.').then();
                }
            }
        });
}

// função para cancelar inscrição
async function unsubscribeFromEvent(eventId, subscribeBtn, unsubscribeBtn) {
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
    return unsubscribeUserFromEvent(eventId, uid).then(() => {
        abrirAlerta('Inscrição removida com sucesso!');
        setSubscribeButtons(false, subscribeBtn, unsubscribeBtn);

        // Atualiza botões no card também
        const cardSubscribeBtn = document.getElementById(getEventElementId('inscrever-btn', eventId));
        const cardUnsubscribeBtn = document.getElementById(getEventElementId('cancelar-inscricao-btn', eventId));
        setSubscribeButtons(false, cardSubscribeBtn, cardUnsubscribeBtn);
    }).finally(_ => {
        hideItem(loading);
    });
}

export async function unsubscribeUserFromEvent(eventId, uid) {
    const user = await getDataFromUser(uid);

    const inscricaoRef = refFromDatabase(InscricoesDatabaseRef, `${eventId}/${uid}`);

    // Se não encontrou a inscrição, retorna
    if (!inscricaoRef) return;

    const inscricaoSnap = await getDataFromDatabase(inscricaoRef);

    if (!inscricaoSnap.exists()) return;

    // Retira a pontuação desse evento do usuário
    if (inscricaoSnap.val().presenca === true) {
        await atualizarPontuacaoUsuario(uid, eventId, false);
    }

    try {
        // Remove a inscrição do usuário
        remove(inscricaoRef)
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
    } catch (error) {
        enviarErroParaSentry(error);
        abrirAlerta('Erro ao cancelar inscrição. Tente novamente.').then( );
        throw error; // Lança o erro para cima
    }
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
                    const inscreverBtn = document.getElementById(getEventElementId('inscrever-btn', eventId));
                    if (inscreverBtn) inscreverBtn.style.display = "inline-block";

                    const desinscreverBtn = document.getElementById(getEventElementId('cancelar-inscricao-btn', eventId));
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
    tituloFotos.style.width = "80%"; // para evitar que o texto fique atrás do botão de fechar
    tituloFotos.style.marginLeft = "10%"; // para centralizar (a largura fica 80% e, logo, a margem direita fica 10% tbm)
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
        abrirAlerta('Selecione o evento e informe o link.').then( );
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
        const index = links.indexOf(url);
        
        if (index === -1) return; // Se o link não estiver na lista, não faz nada
        
        links.splice(index, 1);

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

// Tempo, em milissegundos, para esperar para obter a
// colocação quando o usuário se inscreve em um evento.
const delayForGettingPosition = 700;
/**
 * Quando o usuário consegue se inscrever com sucesso, essa função é chamada
 * @param eventId id do evento que o usuário local acabou de se inscrever
 * @return {Promise<void>}
 */
async function onSuccessfulSubscription(eventId) {
    const loadingElement = document.getElementById('modalOverlayInscricaoLoading');
    loadingElement.style.display = ""; // faz aparecer o loading

    const positionElement = document.getElementById('modalOverlayInscricaoPosicao');
    hideItem(positionElement); // esconde a posição até obter ela

    showItemAsFlex(modalInscricaoEvento); // mostra o modal o mais rápido possível (para o usuário ver que a inscrição deu certo)

    let indice = -1; // posição que o usuário está. -1 se não encontrou

    const uid = Auth.currentUser.uid; // uid do usuário

    // Espera um tempo para obter a posição (para evitar overload no servidor)
    await delay(delayForGettingPosition);

    // Obtém as inscrições do evento do id dado
    const inscricoesSnap = await getDataFromDatabase(InscricoesDatabaseRef, `${eventId}`);

    // Verifica a posição apenas se a snapshot existe
    if (inscricoesSnap.exists()) {
        const inscricoes = [];

        // Obtém as inscrições e ordena elas
        inscricoesSnap.forEach(childSnap => {
            inscricoes.push({
                uid: childSnap.key,
                dataInscricao: childSnap.val().dataInscricao || 0
            });
        });

        inscricoes.sort((a, b) => a.dataInscricao - b.dataInscricao);

        // Obtém a posição
        indice = inscricoes.findIndex((v) => {
            return v.uid === uid; // retorna o índice da inscrição com o uid do usuário local
        });
    }

    if (indice === -1) { // se não conseguiu achar
        positionElement.textContent = "Não foi possível obter a sua posição.";
    } else {
        positionElement.textContent = (indice + 1) + "ª"; // +1, pois o indice é 0-indexed
    }

    // Retira o loading e mostra os elementos
    hideItem(loadingElement);
    showItem(positionElement);
}

// Define as função de inscrever/desinscrever no eventUI.js
setEventFunctions(subscribeToEvent, unsubscribeFromEvent, showEventPhotos, updateEvent, removeEvent, listarInscritos);