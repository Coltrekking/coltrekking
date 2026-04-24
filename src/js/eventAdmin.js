// Importa as coisas do firebase que serão usadas
import {Database} from "../config/firebase";
import {
    hideItem,
    showItem,
    eventForm,
    loading,
    editEventForm,
    submitEventForm,
    showError,
    getRefFromDatabase
} from "./utils"
import {validarOrdemDatas} from "./date";
import {get} from 'firebase/database'
import {atualizarPontuacaoUsuario, calcularPontuacaoDoEvento} from "/src/js/event";

const dbRefEvents  = Database.ref('event');

export function criarEvento() {
    hideItem(eventForm);
    showItem(loading);

    let nome = document.getElementById('nome').value;
    let distancia = document.getElementById('distancia').value;
    let subida = parseFloat(document.getElementById('subida').value) || 0;
    let descida = parseFloat(document.getElementById('descida').value) || 0;
    let trajeto = document.getElementById('trajeto').value;
    let dificuldade = document.getElementById('dificuldade').value;
    let data = document.getElementById('data').value;
    let dataInscricao = document.getElementById('dataInscricao').value;
    let dataPrelecao = document.getElementById('dataPrelecao').value;
    let localPrelecao = document.getElementById('localPrelecao').value;
    let localEncontro = document.getElementById('localEncontro').value;
    let descricao = document.getElementById('descricao').value;
    //let percursoAltimetria = document.getElementById('percursoAltimetria').files[0] ? document.getElementById('percursoAltimetria').files[0].name : '';

    if (nome && distancia && trajeto && dificuldade && data && dataInscricao && dataPrelecao && localPrelecao && localEncontro && descricao) {
        if (!validarOrdemDatas(dataInscricao, dataPrelecao, data)) {
            hideItem(loading);
            showItem(eventForm);
            return;
        }

        let newEventRef = dbRefEvents.push();
        newEventRef.set({
            nome: nome,
            distancia: distancia,
            subida: subida,
            descida: descida,
            trajeto: trajeto,
            dificuldade: dificuldade,
            data: data,
            dataInscricao: dataInscricao,
            dataPrelecao: dataPrelecao,
            localPrelecao: localPrelecao,
            localEncontro: localEncontro,
            descricao: descricao,
            //percursoAltimetria: percursoAltimetria
        }).then(function () {
            alert('Evento criado com sucesso!');
            hideItem(loading);
            hideItem(eventForm);
        }).catch(function (error) {
            showError('Erro ao criar evento:', error);
            hideItem(loading);
            showItem(eventForm);
        });
    } else {
        alert('Por favor, preencha todos os campos do evento.');
        hideItem(loading);
        showItem(eventForm);
    }
}

export async function atualizarEvento() {
    let key = eventForm.dataset.editingKey;
    if (!key) {
        alert('Erro: nenhum evento em edição.');
        return;
    }

    // Retira a pontuação do evento de todos os inscritos
    //  obs: retirar e depois colocar a pontuação foi a forma que
    //  encontrei de lidar com a lógica duvidosa do código inteiro.
    await atualizarPontuacaoDosInscritosDoEvento(key, false);

    // Pegando todos os valores do formulário
    let nome = document.getElementById('nome').value.trim();
    let distancia = document.getElementById('distancia').value.trim();
    let subida = document.getElementById('subida').value.trim();
    let descida = document.getElementById('descida').value.trim();
    let trajeto = document.getElementById('trajeto').value.trim();
    let dificuldade = document.getElementById('dificuldade').value.trim();
    let data = document.getElementById('data').value.trim();
    let dataInscricao = document.getElementById('dataInscricao').value.trim();
    let dataPrelecao = document.getElementById('dataPrelecao').value.trim();
    let localPrelecao = document.getElementById('localPrelecao').value.trim();
    let localEncontro = document.getElementById('localEncontro').value.trim();
    let descricao = document.getElementById('descricao').value.trim();

    if (nome && distancia && trajeto && dificuldade && data && dataInscricao && dataPrelecao && localPrelecao && localEncontro && descricao) {
        if (!validarOrdemDatas(dataInscricao, dataPrelecao, data)) {
            return;
        }

        let dataToUpdate = {
            nome,
            distancia,
            subida,
            descida,
            trajeto,
            dificuldade,
            data,
            dataInscricao,
            dataPrelecao,
            localPrelecao,
            localEncontro,
            descricao
        };

        dbRefEvents.child(key).update(dataToUpdate).then(async () => {
            // Adiciona a pontuação a todos
            await atualizarPontuacaoDosInscritosDoEvento(key, true);

            // Atualiza o texto da lista de inscrições que diz da pontuação do evento
            const pontosListaInscritosElem = document.getElementById("listaInscritosPontuacaoEvento");
            if (pontosListaInscritosElem) {
                const eventSnap = await get(getRefFromDatabase("event/" + key)) ;
                const evento = eventSnap.val();
                pontosListaInscritosElem.innerHTML = `<strong>Pontuação do evento:</strong> ${calcularPontuacaoDoEvento(evento)} pontos`;
            }

            eventForm.reset();
            hideItem(eventForm);
            showItem(submitEventForm);   // mostra de novo o botão de criar
            hideItem(editEventForm);     // esconde o botão de editar

            alert('Evento atualizado com sucesso!');

            /*dbRefEvents.once('value').then(dataSnapshot => {
                fillEventList(dataSnapshot);
            });*/
        }).catch((error) => {
            showError('Erro ao atualizar evento:', error);
        });
    } else {
        alert('Por favor, preencha todos os campos para atualizar o evento.');
    }
}

export function cancelarFormEvento() {
    if (confirm("Tem certeza que deseja cancelar? As alterações não serão salvas.")) {
        currentEditingEvent = false;
        eventForm.reset();
        hideItem(eventForm);
        showItem(submitEventForm); // volta o botão de criar
        hideItem(editEventForm);   // esconde o botão de editar
    }
}

/**
 * Retira a pontuação do evento de todos os seus inscritos.
 * @param eventoId o id do evento que se quer remover os respectivos pontos dos inscritos
 * @param adicionar se deseja adicionar a pontuação aos inscritos (`true`) ou se deseja retirar
 *                  a pontuação dos inscritos (`false`)
 */
async function atualizarPontuacaoDosInscritosDoEvento(eventoId, adicionar) {
    const inscricoesRef = getRefFromDatabase("inscricoes/" + eventoId);
    await get(inscricoesRef)
        .then(snapshot => {
            // Atualiza a pontuação de cada inscrito
            snapshot.forEach(async snapshot => {
                const uid = snapshot.key;
                const presenca = snapshot.val().presenca;

                if (presenca) // Só atualiza se o usuário estiver presente
                    // Atualiza a pontuação do usuário (retirando ela)
                    await atualizarPontuacaoUsuario(uid, eventoId, adicionar);
            });
        });
}

//botão para remover evento
export function removeEvent(key) {
    let selectedItem = document.getElementById(key);

    // título dentro do elemento
    let eventName = selectedItem.querySelector('h3')?.textContent || 'evento';

    let confirmation = confirm('Você tem certeza que deseja remover o evento: "' + eventName + '"?');
    if (confirmation) {
        // Referências
        let eventRef = dbRefEvents.child(key); // eventos/{key}
        let inscricoesRef = Database.ref('inscricoes/' + key); // inscricoes/{key}

        // Certifique-se que essa função é executada antes de remover o evento!
        // Para ter essa certeza, eu chamei ela e o resto do código está dentro do
        // 'then'.
        atualizarPontuacaoDosInscritosDoEvento(key, false)
            .then(_ => {
                // Executa as duas remoções em paralelo
                Promise.all([
                    eventRef.remove(),
                    inscricoesRef.remove()
                ])
                    .then(async () => {
                        selectedItem.remove();
                        console.log("Evento e inscrições removidos com sucesso.");
                    })
                    .catch(function (error) {
                        showError("Falha ao remover o evento/inscrições: ", error);
                    }
                );
            }
        )
            .catch(error => {
                showError("Falha ao remover o evento/inscrições: ", error);
            }
        );

        // Fecha a lista de inscritos
        if (currentListingSubscribeEvent === key) {
            fecharListaInscritos();
        }

        // Fecha o menu de edição
        if (currentEditingEvent === key) {
            eventForm.reset();
            hideItem(eventForm);
            showItem(submitEventForm); // volta o botão de criar
            hideItem(editEventForm);   // esconde o botão de editar
        }

    }
}

/**
 * Fecha a lista de inscritos
 */
export function fecharListaInscritos() {
    const container = document.getElementById("inscritosContainer");
    if (container) container.classList.add("startHidden");
    currentListingSubscribeEvent = null;
}

// Id do evento que está atualmente sendo editado.
// `null` se não houver evento sendo editado
let currentEditingEvent = null

//botão para editar evento
export function updateEvent(key) {
    currentEditingEvent = key;
    const eventRef = Database.ref('event/' + key);

    eventForm.scrollIntoView({ behavior: "smooth", block: "start" });

    eventRef.once('value').then(snapshot => {
        const value = snapshot.val();
        if (!value) {
            alert('Evento não encontrado no banco.');
            return;
        }

        // Preenche os campos diretamente com os valores salvos no BD
        document.getElementById('nome').value = value.nome || '';
        document.getElementById('descricao').value = value.descricao || '';
        document.getElementById('data').value = value.data || ''; // já no formato correto
        document.getElementById('dataInscricao').value = value.dataInscricao || '';
        document.getElementById('dataPrelecao').value = value.dataPrelecao || '';
        document.getElementById('localPrelecao').value = value.localPrelecao || '';
        document.getElementById('localEncontro').value = value.localEncontro || '';
        document.getElementById('dificuldade').value = value.dificuldade || '';
        document.getElementById('distancia').value = value.distancia || '';
        document.getElementById('subida').value = value.subida || '';
        document.getElementById('descida').value = value.descida || '';
        document.getElementById('trajeto').value = value.trajeto || '';

        // Guarda a key para usar depois na atualização
        eventForm.dataset.editingKey = key;

        // Mostra formulário de edição
        showItem(eventForm);
        hideItem(submitEventForm);
        showItem(editEventForm);
    });
}

// botão para listar inscrições de um evento e exportar CSV
export function exportarInscricoesCSV(eventId, nomeEvento = 'Evento', dataInicioEvento = null) {
    const inscricoesRef = Database.ref('inscricoes/' + eventId);

    inscricoesRef.once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                alert(`Nenhuma inscrição encontrada para "${nomeEvento}".`);
                return;
            }

            const inscricoes = [];
            const promises = [];

            snapshot.forEach(childSnap => {
                const uid = childSnap.key;
                const inscricaoData = childSnap.val();

                if (!uid) {
                    console.warn("Inscrição sem UID:", inscricaoData);
                    return;
                }

                // Filtra pelo timestamp da inscrição se dataInicioEvento foi informada
                if (dataInicioEvento && inscricaoData.dataInscricao) {
                    if (inscricaoData.dataInscricao < new Date(dataInicioEvento).getTime()) {
                        return; // ignora inscrições antes do início do evento
                    }
                }

                const userRef = Database.ref('users/' + uid);
                const p = userRef.once('value').then(userSnap => {
                    const userData = userSnap.val() || {};
                    inscricoes.push({
                        nome: userData.nome || '---',
                        email: userData.email || inscricaoData.email || '---',
                        turma: userData.userClass || inscricaoData.userClass || '---',
                        curso: userData.userCourse || inscricaoData.userCourse || '---',
                        cpf: userData.userId || inscricaoData.userId || '---',
                        uid: uid,
                        dataInscricao: inscricaoData.dataInscricao || null
                    });
                });

                promises.push(p);
            });

            return Promise.all(promises).then(() => inscricoes);
        })
        .then(inscricoes => {
            if (!inscricoes || inscricoes.length === 0) {
                alert('Nenhuma inscrição válida encontrada.');
                return;
            }

            // Ordena por data de inscrição (mais antiga primeiro)
            inscricoes.sort((a, b) => (a.dataInscricao || 0) - (b.dataInscricao || 0));

            function formatarData(ts) {
                if (!ts) return '---';
                return new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
            }

            const csvRows = [];
            csvRows.push(["", "Nome", "Email", "Turma", "Curso", "CPF", "Data de Inscrição"]);

            inscricoes.forEach((i, index) => {
                csvRows.push([
                    index + 1, // número da linha
                    `"${i.nome.replace(/"/g, '""')}"`,
                    `"${i.email.replace(/"/g, '""')}"`,
                    `"${i.turma}"`,
                    `"${i.curso}"`,
                    `"${(i.cpf || '---').replace(/"/g, '""')}"`,
                    `"${formatarData(i.dataInscricao)}"`
                ]);
            });

            const csvString = csvRows.map(e => e.join(";")).join("\n");
            const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });

            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `${nomeEvento.replace(/\s+/g, '_')}_inscricoes.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch(error => {
            console.error('Erro ao buscar inscrições:', error);
            alert('Erro ao buscar inscrições.');
        });
}




// Id do evento que está listando os inscritos atualmente.
// `null` se não estiver listando nada.
let currentListingSubscribeEvent = null

// botão para listar inscritos e registrar presença (FATOR K)
export function listarInscritos(eventId) {
    currentListingSubscribeEvent = eventId;
    const inscritosContainer = document.getElementById("inscritosContainer");
    const inscritosList = document.getElementById("inscritosList");

    if (!inscritosContainer || !inscritosList) {
        console.error("Container de inscritos não encontrado no HTML!");
        return;
    }

    inscritosContainer.classList.remove("startHidden");
    inscritosList.innerHTML = "<p>Carregando inscritos...</p>";

    inscritosContainer.scrollIntoView({ behavior: "smooth", block: "start" });

    const inscricoesRef = Database.ref("inscricoes/" + eventId);

    inscricoesRef.once("value")
        .then(snapshot => {
            inscritosList.innerHTML = "";

            if (!snapshot.exists()) {
                inscritosList.innerHTML = "<p>Nenhum inscrito encontrado neste evento.</p>";
                return;
            }

            // Mostra pontuação do evento
            Database.ref("event/" + eventId).once("value").then(eventSnap => {
                const evento = eventSnap.val();
                if (!evento) return;

                const pontuacaoEvento = calcularPontuacaoDoEvento(evento);

                const pontosElem = document.createElement("p");
                pontosElem.id = "listaInscritosPontuacaoEvento";
                pontosElem.innerHTML = `<strong>Pontuação do evento:</strong> ${pontuacaoEvento} pontos`;
                pontosElem.className = "pontuacao-evento";
                inscritosList.appendChild(pontosElem);
            });

            // Lista inscritos
            const inscricoes = [];
            snapshot.forEach(childSnap => {
                inscricoes.push({
                    uid: childSnap.key,
                    dataInscricao: childSnap.val().dataInscricao || 0,
                    presenca: childSnap.val().presenca || false
                });
            });

            inscricoes.sort((a, b) => a.dataInscricao - b.dataInscricao);

            const totalElem = document.createElement("p");
            totalElem.textContent = `Total de inscritos: ${inscricoes.length}`;
            totalElem.className = "total-inscritos";
            inscritosList.appendChild(totalElem);

            const promises = inscricoes.map((inscricao, index) => {
                const userRef = Database.ref("users/" + inscricao.uid);
                return userRef.once("value").then(userSnap => {
                    const user = userSnap.val() || {};

                    const userCard = document.createElement("div");
                    userCard.className = "user-card";

                    const row = document.createElement("div");
                    row.className = "user-row";

                    const posElem = document.createElement("span");
                    posElem.className = "user-pos";
                    posElem.textContent = `${index + 1}º `;
                    row.appendChild(posElem);

                    const nameElem = document.createElement("span");
                    nameElem.textContent = user.nome || "---";
                    row.appendChild(nameElem);

                    const presencaBtn = document.createElement("button");
                    presencaBtn.textContent = inscricao.presenca ? "Presente" : "Ausente";
                    presencaBtn.className = `presenca-btn ${inscricao.presenca ? "presente" : "ausente"}`;

                    presencaBtn.addEventListener("click", async () => {
                        try {
                            const presencaRef = Database.ref(`inscricoes/${eventId}/${inscricao.uid}/presenca`);
                            const presencaSnap = await presencaRef.once("value");
                            const atual = presencaSnap.val() === true;
                            const novoStatus = !atual;

                            // Atualiza pontos (soma se novoStatus = true, subtrai se false)
                            await atualizarPontuacaoUsuario(inscricao.uid, eventId, novoStatus);

                            // Atualiza presença no BD
                            await presencaRef.set(novoStatus);

                            // Atualiza botão visualmente
                            presencaBtn.textContent = novoStatus ? "Presente" : "Ausente";
                            presencaBtn.classList.toggle("presente", novoStatus);
                            presencaBtn.classList.toggle("ausente", !novoStatus);
                        } catch (err) {
                            console.error("Erro ao atualizar presença:", err);
                            alert("Erro ao atualizar presença. Tente novamente.");
                        }
                    });

                    row.appendChild(presencaBtn);
                    userCard.appendChild(row);
                    inscritosList.appendChild(userCard);
                });
            });

            return Promise.all(promises);
        })
        .catch(err => {
            console.error("Erro ao carregar inscritos:", err);
            inscritosList.innerHTML = "<p>Erro ao carregar inscritos.</p>";
        });
}



