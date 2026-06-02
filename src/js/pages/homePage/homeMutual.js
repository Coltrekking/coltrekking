/**
 * Código comum entre a página home de usuário e admin.
 * Esse código é chamado tanto no homeAdmin quanto no homePage,
 * e serve para evitar repetição de código.
 */
import {Auth} from "/src/config/firebase";
import {checkAuth, deleteAccount, isAdmin, userSignOut, waitForUser} from "../../auth";
import {
    cancelEdit,
    editPersonalInfo,
    hideItem,
    showItem,
    userId, userClass, userCourse, validarCPF, getDataFromUser,
    EventsDatabaseRef, refFromUser, editPersonalInfoModal, editInfoSubmitBtn
} from "../../utils";
import {abrirAlerta, abrirAviso} from "../../modal.js";
import {openTab} from "../../tabs";
import {fillEventList} from "../../event";
import {onValue, update} from "firebase/database";
import {onAuthStateChanged} from "firebase/auth";
import {enviarErroParaSentry} from "/src/js/main";

// Endereço da página de usuário
const USER_PAGE_ADDRESS = "/homePage.html"
// Endereço da página de admin
const ADMIN_PAGE_ADDRESS = "/homeAdmin.html"

export const createPhotoBtn = document.getElementById('createPhoto');
// export const addPhotoBtn    = document.getElementById('addPhotoBtn');
export const photoAdminForm = document.getElementById('photoAdminForm');

/**
 * Carrega os eventos comuns da página
 */
export function loadCommonEvents() {
    // Auth + role
    onAuthStateChanged(Auth,user => {
        if (!user) return;

        getDataFromUser(user.uid)
            .then(_snapshot => {

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
    if (signOutBtn) signOutBtn.onclick = () => userSignOut();

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
    };
    document.getElementById("blockListBtn").onclick = (event) => {
        openTab('lista-blocks', event);
    };
    document.getElementById("instructionBtn").onclick = (event) => {
        openTab('instrucoes', event);
    };

    document.getElementById("fecharMenuFotos").onclick = _ => {
        hideItem(document.getElementById("modalOverlayFotosEvento"));
    }
}

/**
 * Carrega os eventos e outras coisas que as páginas têm em comum.
 * Isso serve para não precisar repetir código.
 */
async function loadCommon() {
    // Não acho que tenha necessidade de colocar loading bem no início
    // showLoading();

    // Carrega o usuário (por padrão)
    await waitForUser();
    // Verifica a autenticação do usuário
    checkAuth()

    // Redirect logic after user is loaded
    if (isAdmin()) {
        if (!window.location.pathname.includes("Admin")) {
            await abrirAlerta("Você será redirecionado para a página de administrador.")
            window.location.href = ADMIN_PAGE_ADDRESS;
        }
    } else {
        if (window.location.pathname.includes("Admin")) {
            await abrirAlerta("Você não tem permissão de acessar essa página!")
            window.location.href = USER_PAGE_ADDRESS;
        }
    }

    // Atualiza os eventos todas às vezes que algum dado atualizar
    onValue(EventsDatabaseRef, function (dataSnapshot) {
        fillEventList(dataSnapshot);
    });


    //tratar o envio do formulário de edição de informações pessoais
    if (editInfoSubmitBtn) {
        editInfoSubmitBtn.onclick = function () {
            const user = Auth.currentUser;
            if (!user) return;

            const uid = user.uid;
            const cpf = document.getElementById('cpf').value.trim();
            const turma = document.getElementById('turma').value.trim();
            const curso = document.getElementById('curso').value.trim();

            const cpfLimpo = cpf.replace(/[^\d]+/g, '');

            if (!validarCPF(cpfLimpo)) {
                abrirAlerta('CPF inválido. Verifique e tente novamente.');
                return;
            }

            update(refFromUser(uid), {
                userId: cpfLimpo,
                userClass: turma,
                userCourse: curso
            }).then(() => {
                abrirAlerta('Informações atualizadas com sucesso!');

                // Atualiza os elementos da página imediatamente
                if (userId) userId.innerHTML = `CPF: ${cpfLimpo}`;
                if (userClass) userClass.innerHTML = `Turma: ${turma}`;
                if (userCourse) userCourse.innerHTML = `Curso: ${curso}`;

                hideItem(editPersonalInfoModal);
            }).catch(err => {
                console.error('Erro ao atualizar informações:', err);
                enviarErroParaSentry(err);

                abrirAlerta('Erro ao atualizar informações. Tente novamente.');
            });
        };
    }

    // Avisa para o usuário preencher os dados necessários para se
    // inscrever nos eventos, caso ele ainda não tenha preenchido.
    warnIfCantSubscribeToEvents();
}

/**
 * Se o usuário não tiver definido os atributos necessários (CPF, turma ou curso), ]
 * exibe um alerta pedindo para ele preencher essas informações.
 */
function warnIfCantSubscribeToEvents() {
    getDataFromUser(Auth.currentUser.uid)
        .then(snapshot => {
            const userData = snapshot.val();

            if (!userData) return; // Se não tiver carregado os dados, só pula o aviso

            // Se o usuário não tiver preenchido CPF, turma ou curso, exibe um aviso.
            if (!userData.userId || !userData.userClass || !userData.userCourse) {
                abrirAviso("Para conseguir se inscrever nos eventos, preencha seu CPF, turma e curso na seção de informações pessoais.").then();
            }
        }).catch(err => {
            console.error('Erro ao verificar dados do usuário:', err);
            enviarErroParaSentry(err);
        });
}

// Carrega o que tem em comum
await loadCommon()

