/**
 * Código do homeAdmin.html
 */

import "./homePage"; // Carrega tudo que já haveria na homePage normalmente
import {
    editEventForm,
    eventForm,
    hideItem,
    loading,
    showItem,
    submitEventForm
} from "../../utils";
import {abrirModal, abrirConfirmacao, EntradasModal} from "../../modal";
import {isAdmin} from "../../auth.js";
import {
    createPhotoBtn,
    loadCommonEvents
} from "./homeMutual";
import {
    atualizarEvento,
    cancelarFormEvento,
    criarEvento, editarPontuacaoNecessariaEventoAtual,
    fecharListaInscritos,
    getPontuacaoNecessariaEventoAtual, isUserEditingEvent
} from "../../eventAdmin";

const editEventNeededPointsBtn = document.getElementById("eventoAlterarPontuacaoNecessaria");


/**
 * Pergunta qual deve ser o valor da nova pontuação necessária para o evento atual, mostrando a pontuação atual.
 */
async function perguntarNovaPontuacaoNecessaria() {
    // Caso o usuário esteja editando, confirma se o usuário realmente quer fazer isso
    if (isUserEditingEvent()) {
        const confirmacao = await abrirConfirmacao(
            `Se você editar a pontuação necessária, <b>todos</b> os usuários com <b>menos pontos que a nova pontuação necessária</b> serão, automaticamente, <b>removidos do evento</b>.<br>Deseja continuar?`
        )
        if (!confirmacao) return; // Se o usuário cancelar, para a função
    }

    const pontuacaoEvento = await getPontuacaoNecessariaEventoAtual();
    const resultado = await abrirModal(
        "Pontuação Necessária para Inscrição",
        `A pontuação necessária para se inscrever nesse evento é <b>${pontuacaoEvento}</b>.<br>Deseja alterá-la para que valor?`,
        EntradasModal.NUMERO,
        {
            minNumber: 0 // define o mínimo para ser 0
        })

    // Se o resultado for null, significa que o usuário cancelou a ação, então não faz nada
    if (resultado === null) return;

    // Se chegou até aqui, o usuário colocou algo válido e confirmou a ação
    editarPontuacaoNecessariaEventoAtual(resultado);
}

/**
 * Carrega os eventos
 */
function loadEvents() {
    /*onAuthStateChanged(Auth,user => {
        if (!user) return;
        getDataFromUser(user.uid)
            .then(_ => {

        });
    });*/


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
        cancelarFormEvento().then(() => {});
    };

    // botão de fechar lista
    const fecharInscritosBtn = document.getElementById("fecharInscritos");
    if (fecharInscritosBtn) {
        fecharInscritosBtn.addEventListener("click", () => {
            fecharListaInscritos();
        });
    }

    //document.getElementById('toggleUserManagerBtn').onclick = () => toggleUserManager();

    editEventNeededPointsBtn.onclick = async () => perguntarNovaPontuacaoNecessaria();
}

function loadPage() {
    // Mostra os elementos de admin
    showItem(createPhotoBtn);

    loadCommonEvents();
    loadEvents();
}

if (isAdmin() && window.location.href.includes("homeAdmin")) loadPage();




