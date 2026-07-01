// Importa as coisas do firebase que serão usadas
import {
    editEventForm,
    eventForm,
    EventsDatabaseRef,
    getDataFromDatabase,
    hideItem,
    InscricoesDatabaseRef,
    loading,
    refFromDatabase,
    showError,
    showItem,
    submitEventForm,
    UsersDatabaseRef
} from "./utils"
import {validarOrdemDatas} from "./date";
import {get, push, remove, set, update} from 'firebase/database'
import {
    atualizarPontuacaoUsuario,
    calcularPontuacaoDoEvento, checkSubscribedEventsRequiringMinimumPoints,
    getPontuacaoMinimaParaEvento,
    unsubscribeUserFromEvent
} from "/src/js/event";
import {enviarErroParaSentry} from "/src/js/main";
import {Auth} from "/src/config/firebase";
import * as XLSX from 'xlsx-js-style';
import {abrirAlerta, abrirConfirmacao, abrirModal, EntradasModal} from "/src/js/modal";

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

        let newEventRef = push(EventsDatabaseRef);
        set(newEventRef, {
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
            pontuacaoNecessaria: currentEditingEventData.pontuacaoNecessaria || 0
            //percursoAltimetria: percursoAltimetria
        })
            .then(function () {
                abrirAlerta('Evento criado com sucesso!');
                hideItem(loading);
                hideItem(eventForm);
            }).catch(function (error) {
                showError('Erro ao criar evento:', error);
                hideItem(loading);
                showItem(eventForm);
        });
    } else {
        abrirAlerta('Por favor, preencha todos os campos do evento.');
        hideItem(loading);
        showItem(eventForm);
    }
}

/**
 * Lógica para retirar usuários com pontuação insuficiente, dependendo da dificuldade do evento.
 * @param eventId id do evento
 * @param pontuacaoEvento pontuação do evento
 */
function retirarUsuariosComPontuacaoInsuficiente(eventId, pontuacaoEvento) {
    return getDataFromDatabase(refFromDatabase(InscricoesDatabaseRef, eventId))
        .then(snapshot => {
            // Atualiza a pontuação de cada inscrito
            snapshot.forEach(async snapshot => {
                if (!snapshot.exists()) return;

                const uid = snapshot.key;

                // Retira a pontuação do evento para ver a pontuação "real" do usuário, sem contar o evento que ele pode ser retirado
                let pontuacao = snapshot.val().pontos || 0;
                const presenca = snapshot.val().presenca;
                // Se o usuário tiver presente, retira a pontuação do evento (que el
                if (presenca) {
                    pontuacao = Math.max(pontuacao - pontuacaoEvento, 0);
                }

                // Se a pontuação do usuário for menor que a pontuação mínima
                // para o evento, retira ele
                if (pontuacao <= getPontuacaoMinimaParaEvento(eventId)) {
                    // Se o usuário estiver presente, retira a pontuação do evento dele antes de retirar ele do evento
                    if (presenca)
                        await atualizarPontuacaoUsuario(uid, eventId, false);

                    // Desinscreve o usuário
                    await unsubscribeUserFromEvent(eventId, uid);

                    // Se o usuário que foi retirado for o usuário atual, atualiza os botões de inscrever/desinscrever
                    if (uid === Auth.currentUser.uid) {
                        const inscreverBtn = document.getElementById(`subscribeBtn-${eventId}`);
                        inscreverBtn.style.display = "inline-block";

                        const desinscreverBtn = document.getElementById(`unsubscribeBtn-${eventId}`);
                        hideItem(desinscreverBtn);
                    }
                }
            });
        });
}

export async function atualizarEvento() {
    let key = eventForm.dataset.editingKey;
    if (!key) {
        await abrirAlerta('Erro: nenhum evento em edição.');
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
    let pontuacaoNecessaria;

    if (currentEditingEventData.pontuacaoNecessaria !== undefined)
        pontuacaoNecessaria = String(currentEditingEventData.pontuacaoNecessaria).trim();
    else
        pontuacaoNecessaria = "0";

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
            pontuacaoNecessaria
        };


        update(refFromDatabase(EventsDatabaseRef, key), dataToUpdate)
            .then(async () => {
                // Adiciona a pontuação a todos
                await atualizarPontuacaoDosInscritosDoEvento(key, true);

                // Atualiza o texto da lista de inscrições que diz da pontuação do evento
                const pontosListaInscritosElem = document.getElementById("listaInscritosPontuacaoEvento");
                if (pontosListaInscritosElem) {
                    const eventSnap = await get(refFromDatabase("event/" + key)) ;
                    const evento = eventSnap.val();
                    pontosListaInscritosElem.innerHTML = `<strong>Pontuação do evento:</strong> ${calcularPontuacaoDoEvento(evento)} pontos`;
                }

                // Verifica a dificuldade do evento (se precisar de pontuação mínima).
                // Se houver usuários que não têm a pontuação mínima, retira eles do evento
                if (getPontuacaoMinimaParaEvento(key) > 0) {
                    await retirarUsuariosComPontuacaoInsuficiente(key, calcularPontuacaoDoEvento(dataToUpdate));
                }

                if (currentListingSubscribeEvent === key)
                    listarInscritos(key, true); // só atualiza, para evitar "inscritos fantasmas"

                eventForm.reset();
                hideItem(eventForm);
                showItem(submitEventForm);   // mostra de novo o botão de criar
                hideItem(editEventForm);     // esconde o botão de editar

                await abrirAlerta('Evento atualizado com sucesso!');

                currentEditingEvent = null;
                currentEditingEventData = {};

                /*dbRefEvents.once('value').then(dataSnapshot => {
                    fillEventList(dataSnapshot);
                });*/
            }).catch((error) => {
                showError('Erro ao atualizar evento:', error);
            });


    } else {
        await abrirAlerta('Por favor, preencha todos os campos para atualizar o evento.');
    }
}

// Cancela o formulário de criação/edição de evento, limpando os campos
// e escondendo o formulário
export async function cancelarFormEvento() {
    if (await abrirConfirmacao("Tem certeza que deseja cancelar? As alterações não serão salvas.")) {
        currentEditingEvent = null;
        currentEditingEventData = {};
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
    await getDataFromDatabase(refFromDatabase(InscricoesDatabaseRef, eventoId))
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
export async function removeEvent(key) {
    let selectedItem = document.getElementById(key);

    // título dentro do elemento
    let eventName = selectedItem.querySelector('h3')?.textContent || 'evento';

    let confirmation = await abrirConfirmacao('Você tem certeza que deseja remover o evento: "' + eventName + '"?');
    if (confirmation) {
        // Referências
        let eventRef = refFromDatabase(EventsDatabaseRef, key); // eventos/{key}
        let inscricoesRef = refFromDatabase(InscricoesDatabaseRef, key); // inscricoes/{key}

        // Certifique-se que a função de atualizar pontuação é executada antes de
        // remover o evento! Para ter essa certeza, eu chamei ela e o resto do código
        // está dentro do 'then'.
        atualizarPontuacaoDosInscritosDoEvento(key, false)
            // Verifica as pontuações dos usuários
            .then(async () => {
                const inscritosSnapshot = await getDataFromDatabase(inscricoesRef);

                let inscritos = [];
                inscritosSnapshot.forEach(snap => {
                    inscritos.push(snap);
                })

                const verificacoes = inscritos.map(async inscricaoSnap => {
                    const uid = inscricaoSnap.key;
                    // Verifica os eventos que o usuário está inscrito para checar
                    // se, em algum deles, ele não tem mais ponto suficiente para participar.
                    await checkSubscribedEventsRequiringMinimumPoints(uid);
                })

                await Promise.all(verificacoes);
            })
            .then(_ => {
                // Executa as duas remoções em paralelo
                Promise.all([
                    remove(eventRef),
                    remove(inscricoesRef)
                ])
                    .then(async () => {
                        selectedItem.remove();
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
let currentEditingEventData = {};

//botão para editar evento
export function updateEvent(key) {
    currentEditingEvent = key;
    currentEditingEventData = {};
    const eventRef = refFromDatabase(EventsDatabaseRef, key);

    eventForm.scrollIntoView({ behavior: "smooth", block: "start" });

    getDataFromDatabase(eventRef)
        .then(snapshot => {
        const value = snapshot.val();
        if (!value) {
            abrirAlerta('Evento não encontrado no banco.');
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
        // Escreve a pontuação + a palavra "ponto" ou "pontos" dependendo do número
        document.getElementById("eventoPontuacaoNecessaria").innerHTML
            = `${value.pontuacaoNecessaria || 0} ${Number(value.pontuacaoNecessaria) === 1 ? 'ponto' : 'pontos'}`;

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
    const inscricoesRef = refFromDatabase(InscricoesDatabaseRef, eventId);
    getDataFromDatabase(inscricoesRef)
        .then(snapshot => {
            if (!snapshot.exists()) {
                abrirAlerta(`Nenhuma inscrição encontrada para "${nomeEvento}".`);
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

                const p = getDataFromDatabase(UsersDatabaseRef, uid).then(userSnap => {
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
                abrirAlerta('Nenhuma inscrição válida encontrada.');
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
            enviarErroParaSentry(error);
            abrirAlerta('Erro ao buscar inscrições.');
        });
}

export function exportarInscricoesXLSX(eventId, nomeEvento = 'Evento', dataInicioEvento = null) {
    const inscricoesRef = refFromDatabase(InscricoesDatabaseRef, eventId);

    getDataFromDatabase(inscricoesRef)
        .then(snapshot => {
            if (!snapshot.exists()) {
                abrirAlerta(`Nenhuma inscrição encontrada para "${nomeEvento}".`);
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

                const p = getDataFromDatabase(UsersDatabaseRef, uid).then(userSnap => {
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
                abrirAlerta('Nenhuma inscrição válida encontrada.');
                return;
            }

            // Ordena por data de inscrição (mais antiga primeiro)
            inscricoes.sort((a, b) => (a.dataInscricao || 0) - (b.dataInscricao || 0));

            function formatarData(ts) {
                if (!ts) return '---';
                return new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
            }

            // Prepara a matriz de dados para a planilha
            const sheetData = [];

            // Adiciona a linha de Cabeçalho
            sheetData.push([" ", "Nome", "Email", "Turma", "Curso", "CPF", "Data de Inscrição"]);

            // Adiciona as linhas de dados
            inscricoes.forEach((i, index) => {
                sheetData.push([
                    index + 1,
                    i.nome,
                    i.email,
                    i.turma,
                    i.curso,
                    i.cpf || '---',
                    formatarData(i.dataInscricao)
                ]);
            });

            // Converte a matriz de dados em uma planilha
            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

            // Ajusta automaticamente a largura das colunas
            worksheet['!cols'] = [
                {wch: 5},  // #
                {wch: 30}, // Nome
                {wch: 35}, // Email
                {wch: 15}, // Turma
                {wch: 25}, // Curso
                {wch: 15}, // CPF
                {wch: 20}  // Data
            ];

            // Cria um arquivo e adiciona a planilha a ele
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Inscrições");

            // Gera o arquivo e aciona o download automático
            const nomeArquivo = `${nomeEvento.replace(/\s+/g, '_')}_inscricoes.xlsx`;
            XLSX.writeFile(workbook, nomeArquivo);
        })
        .catch(error => {
            console.error('Erro ao buscar inscrições:', error);
            enviarErroParaSentry(error);
            abrirAlerta('Erro ao buscar inscrições.');
        });
}

/**
 * Exporta um arquivo xlsx com as pessoas selecionadas, obedecendo a quantidade de selecionados.
 * @param eventId id do evento
 * @param nomeEvento nome do evento
 * @param dataInicioEvento
 * @param qntdSelecionados quantidade de pessoas que deverão ser selecionadas
 */
export function exportarSelecionadosXLSX(eventId, nomeEvento = 'Evento', dataInicioEvento = null, qntdSelecionados) {
    // Palavras que não devem começar com letra maiúscula.
    // Obs.: palavras com 1 letra já estão incluídas
    const excecoesCapitalizar = ["da", "das", "de", "do", "dos"]

    const inscricoesRef = refFromDatabase(InscricoesDatabaseRef, eventId);

    getDataFromDatabase(inscricoesRef)
        .then(snapshot => {
            if (!snapshot.exists()) {
                abrirAlerta(`Nenhuma inscrição encontrada para "${nomeEvento}".`).then( );
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

                // Se não tiver presente, não considera
                if (!inscricaoData.presenca) return;

                // Filtra pelo timestamp da inscrição se dataInicioEvento foi informada
                if (dataInicioEvento && inscricaoData.dataInscricao) {
                    if (inscricaoData.dataInscricao < new Date(dataInicioEvento).getTime()) {
                        return; // ignora inscrições antes do início do evento
                    }
                }

                const p = getDataFromDatabase(UsersDatabaseRef, uid).then(userSnap => {
                    const userData = userSnap.val() || {};
                    inscricoes.push({
                        nome: userData.nome || '---',
                        dataInscricao: inscricaoData.dataInscricao
                    });
                });

                promises.push(p);
            });

            return Promise.all(promises).then(() => inscricoes);
        })
        .then(inscricoes => {
            if (!inscricoes || inscricoes.length === 0) {
                abrirAlerta('Nenhuma inscrição válida encontrada.');
                return;
            }

            // Ordena por data de inscrição (mais antiga primeiro)
            inscricoes.sort((a, b) => (a.dataInscricao || 0) - (b.dataInscricao || 0));

            // Adiciona o atributo "passou" aos primeiros 'qntdSelecionados' inscritos
            for (let i = 0; i < inscricoes.length; i++) {
                inscricoes[i].passou = i < qntdSelecionados;
            }

            /*function formatarData(ts) {
                if (!ts) return '---';
                return new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
            }*/

            // Prepara a matriz de dados para a planilha
            const sheetData = [];

            // Adiciona a linha de Cabeçalho
            sheetData.push(["POSIÇÃO", "NOME", "STATUS"]);

            // Adiciona as linhas de dados
            inscricoes.forEach((i, index) => {
                let nome = i.nome.trim();

                // Obtém a última palavra do nome e, se o nome termina em "coltec",
                // retira essa palavra "coltec"
                if (nome.split(" ").at(-1).toLowerCase() === "coltec")
                    nome = nome.slice(0, -7); // retira o "coltec"

                // Faz as palavras começarem com letra maiúscula (com exceções,
                // como 'da', 'o', etc)
                nome = nome.split(' ').map((palavra) => {
                    const palavraMinusculo = palavra.toLowerCase();

                    // Se a palavra é uma exceção (ou tem apenas uma letra), retorna
                    if (excecoesCapitalizar.includes(palavraMinusculo) || palavraMinusculo.length === 1)
                        return palavraMinusculo;

                    return palavra.charAt(0).toUpperCase() + palavra.slice(1);
                }).join(' '); // o `join()` une as palavras

                sheetData.push([
                    index + 1,
                    nome,
                    i.passou ? "CONVOCADO" : "FILA DE ESPERA",
                ]);
            });

            // Converte a matriz de dados em uma planilha
            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

            // Estilização //

            // Estilo do cabeçalho
            const headerStyle = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "1F497D" } },
                alignment: { horizontal: "center", vertical: "center" }
            };

            // Aplica o estilo na primeira linha (A1, B1, C1)
            worksheet["A1"].s = headerStyle;
            worksheet["B1"].s = headerStyle;
            worksheet["C1"].s = headerStyle;

            // Estilo para as outras linhas (dados)
            const borderStyle = {
                top: { style: "thin", color: { auto: 1 } },
                bottom: { style: "thin", color: { auto: 1 } },
                left: { style: "thin", color: { auto: 1 } },
                right: { style: "thin", color: { auto: 1 } }
            };

            // Percorre as linhas de dados, estilizando elas
            inscricoes.forEach((i, index) => {
                const rowIndex = index + 2; // (+ 2) porque o index começa em 0 e a linha 1 é o cabeçalho

                // Cor dinâmica para o Status (Coluna C)
                const fillStyle = {
                    fgColor: {
                        rgb: i.passou ? "D1F1CF" : "EEEEEE" // Verde se passou, cinza claro se não
                    }
                } ; // Verde se passou, branco se fila

                // Estilos padrão das colunas A e B com borda
                worksheet[`A${rowIndex}`].s = {
                    alignment: { horizontal: "center" },
                    border: borderStyle,
                    fill: fillStyle
                };
                worksheet[`B${rowIndex}`].s = {
                    border: borderStyle,
                    fill: fillStyle
                };
                worksheet[`C${rowIndex}`].s = {
                    font: { bold: true },
                    alignment: { horizontal: "center" },
                    border: borderStyle,
                    fill: fillStyle
                };
            });

            // Fim da estilização //

            // Ajusta automaticamente a largura das colunas
            worksheet['!cols'] = [
                {wch: 10},  // #
                {wch: 50}, // Nome
                {wch: 15}  // Status
            ];

            // Cria um arquivo e adiciona a planilha a ele
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Participantes");

            // Gera o arquivo e aciona o download automático
            const nomeArquivo = `LISTA DE PARTICIPANTES ${nomeEvento.replace(/\s+/g, '_')}.xlsx`;
            XLSX.writeFile(workbook, nomeArquivo);
        })
        .catch(error => {
            console.error('Erro ao obter selecionados:', error);
            enviarErroParaSentry(error);
            abrirAlerta('Erro ao obter selecionados.').then( );
        });
}


// Id do evento que está listando os inscritos atualmente.
// `null` se não estiver listando nada.
let currentListingSubscribeEvent = null

// Se está atualizando a lista de inscritos. Se sim, não
// deixa atualizar novamente.
let atualizandoListaInscritos = false;

/**
 * Botão para listar inscritos e registrar presença (fator K).
 * @param eventId Id do evento
 * @param onlyUpdate se verdadeiro, apenas haverá atualização dos elementos,
 *                   sem abertura do menu nem animação de scroll. Por padrão,
 *                   esse valor é falso.
 */
export function listarInscritos(eventId, onlyUpdate = false) {
    if (atualizandoListaInscritos) return; // evita que a função seja chamada novamente enquanto já está atualizando

    const TODOS_SELECT = 'todos'; // Valor do estado que todos os inscritos serão selecionados

    // Obtém os elementos e reseta o que precisa
    const inscritosModal = document.getElementById("modalOverlayGerenciarInscritosEvento");
    const inscritosList = document.getElementById("inscritosList");
    const inscritoTituloEvento = document.getElementById('menuInscritosTituloEvento');
    const inscritoSearchState = document.getElementById('inscritoSearchState');
    const totalElem = document.getElementById("modalInscritosTotalInscritos");

    // Cria o gif de carregamento
    const inscritosLoadingGif = document.createElement("img");
    inscritosLoadingGif.src = "assets/icons/loading.svg";
    inscritosLoadingGif.alt = "Gif de carregando";
    inscritosLoadingGif.style.height = "max(60px, 3.5em)";

    if (!inscritosModal || !inscritosList) {
        console.error("Container de inscritos não encontrado no HTML!");
        enviarErroParaSentry(new Error("Container de inscritos não encontrado no HTML!"));
        return;
    }

    // Limpa os elementos de dentro
    inscritosList.innerHTML = "";

    currentListingSubscribeEvent = eventId;

    // Mostra pontuação do evento
    getDataFromDatabase(EventsDatabaseRef, eventId).then(eventSnap => {
        const evento = eventSnap.val();
        if (!evento) return;

        const pontuacaoEvento = calcularPontuacaoDoEvento(evento);

        const pontosElem = document.getElementById("listaInscritosPontuacaoEvento");
        pontosElem.innerHTML = `<strong>Pontuação do evento:</strong> ${pontuacaoEvento} pontos`;
        inscritoTituloEvento.innerHTML = evento.nome;
    });

    atualizandoListaInscritos = true;

    if (!onlyUpdate) {
        inscritosList.appendChild(inscritosLoadingGif); // Coloca o loading
        inscritoTituloEvento.innerHTML = "...";
        inscritosLoadingGif.classList.add("loading-animation");
        inscritosModal.style.display = 'flex';
        //inscritosModal.classList.remove("startHidden");
    }

    getDataFromDatabase(InscricoesDatabaseRef, eventId)
        .then(snapshot => {

            if (!snapshot.exists()) {
                inscritosList.innerHTML = "<p>Nenhum inscrito encontrado neste evento.</p>";
                return;
            }

            // Obtém o status
            const state = inscritoSearchState?.value.trim() || TODOS_SELECT;

            // Lista inscritos
            const inscricoes = [];
            snapshot.forEach(childSnap => {
                const presenca = childSnap.val().presenca || false;

                if (presenca && state === 'ausente') return;
                if (!presenca && state === 'presente') return;

                inscricoes.push({
                    uid: childSnap.key,
                    dataInscricao: childSnap.val().dataInscricao || 0,
                    presenca: childSnap.val().presenca || false
                });
            });

            inscricoes.sort((a, b) => a.dataInscricao - b.dataInscricao);


            if (state !== TODOS_SELECT) // Se estiver filtrando pelo estado, adiciona o estado no texto
                totalElem.textContent = `Total de inscritos (${state}s): ${inscricoes.length}`;
            else // Caso não esteja filtrando, deixa da forma normal
                totalElem.textContent = `Total de inscritos: ${inscricoes.length}`;

            const promises = inscricoes.map((inscricao, index) => {
                return getDataFromDatabase(UsersDatabaseRef, inscricao.uid).then(userSnap => {
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
                            const presencaRef = refFromDatabase(InscricoesDatabaseRef, `${eventId}/${inscricao.uid}/presenca`)
                            const presencaSnap = await getDataFromDatabase(presencaRef);
                            const atual = presencaSnap.val() === true;
                            const novoStatus = !atual;

                            // Atualiza pontos (soma se novoStatus = true, subtrai se false)
                            await atualizarPontuacaoUsuario(inscricao.uid, eventId, novoStatus);

                            // Atualiza presença no BD
                            await set(presencaRef, novoStatus);

                            // Atualiza botão visualmente
                            presencaBtn.textContent = novoStatus ? "Presente" : "Ausente";
                            presencaBtn.classList.toggle("presente", novoStatus);
                            presencaBtn.classList.toggle("ausente", !novoStatus);
                        } catch (err) {
                            console.error("Erro ao atualizar presença:", err);
                            enviarErroParaSentry(err);
                            await abrirAlerta("Erro ao atualizar presença. Tente novamente.");
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
            enviarErroParaSentry(err);
            inscritosList.innerHTML = "<p>Erro ao carregar inscritos.</p>";
        }).finally(() => {
            // Quando tudo acabar, volta a permitir atualizações da lista
            atualizandoListaInscritos = false;
            // Retira o loading
            if (inscritosList.contains(inscritosLoadingGif))
                inscritosList.removeChild(inscritosLoadingGif);
        });
}

/**
 * Atualiza a lista de inscritos com o evento atualmente selecionado.
 * Se não houver evento atualmente selecionado, não faz nada.
 */
export function atualizarListaDeInscritos() {
    // Se for nulo, retorna
    if (currentListingSubscribeEvent === null) return;
    listarInscritos(currentListingSubscribeEvent, true);
}

/**
 * Edita a pontuação necessária para poder se inscrever no evento que está sendo criado/editado.
 * @param novaPontuacao nova pontuação
 */
export function editarPontuacaoNecessariaEventoAtual(novaPontuacao) {
    currentEditingEventData.pontuacaoNecessaria = novaPontuacao;
    // Atualiza visualmente
    document.getElementById("eventoPontuacaoNecessaria").innerHTML = `${novaPontuacao} ${Number(novaPontuacao) === 1 ? 'ponto' : 'pontos'}`;
}

/**
 * Pega a pontuação necessária para se inscrever no evento que está sendo criado/editado.
 * @return {number | null} pontuação necessária
 */
export function getPontuacaoNecessariaEventoAtual() {
    // Se estiver criando/editando e estiver salva a pontuação, retorna
    if (currentEditingEventData.pontuacaoNecessaria) return currentEditingEventData.pontuacaoNecessaria;

    if (!currentEditingEvent) return 0;
    return getPontuacaoMinimaParaEvento(currentEditingEvent);
}

/**
 * Retorna se o usuário está editando um evento.
 * @return {boolean} Se o usuário está editando um evento.
 */
export function isUserEditingEvent() {
    return currentEditingEvent !== null;
}

/**
 * Quando o botão de exportar inscritos for clicado, essa função é chamada.
 */
export async function onExportarInscritosBtnClicked() {
    // Se não estiver vendo os inscritos de nenhum inscrito, retorna
    if (currentListingSubscribeEvent === null) return;

    // Obtém o nome do evento
    const evento = await getDataFromDatabase(EventsDatabaseRef, currentListingSubscribeEvent);
    const nome = evento.val().nome;

    // Pergunta em que formato deseja exportar
    const resultado = await abrirModal(
        "Exportar Inscrições",
        "Deseja exportar em qual formato?",
        EntradasModal.SELECAO,
        {opcoes:
                {"xlsx": "Excel/Google Planilhas (.xlsx)", "csv": "CSV (.csv)"}
        }
    );

    if (resultado) {
        switch (resultado) {
            case "csv":
                exportarInscricoesCSV(currentListingSubscribeEvent, nome);
                break;
            case "xlsx":
                exportarInscricoesXLSX(currentListingSubscribeEvent, nome);
                break;
        }
    }
}

/**
 * Quando o botão de obter sekecionados for clicado, essa função é chamada.
 */
export async function onObterSelecionadosBtnClicked() {
    // Se não estiver vendo os inscritos de nenhum inscrito, retorna
    if (currentListingSubscribeEvent === null) return;

    // Obtém o nome do evento
    const evento = await getDataFromDatabase(EventsDatabaseRef, currentListingSubscribeEvent);
    const nome = evento.val().nome;

    const qntd = await abrirModal(
        "Selecionar Participantes",
        "Quantas pessoas deverão ser selecionadas?",
        EntradasModal.NUMERO,
        {
            minNumber: 0
        }
    );

    // Se a pessoa cancelar, retorna
    if (qntd === null) return;

    exportarSelecionadosXLSX(currentListingSubscribeEvent, nome, null, qntd);
}