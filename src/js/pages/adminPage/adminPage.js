/**
 * Página de administração do coltrekking.
 *
 * @author André Dias
 * @since 2026-06
 */
import {isAdmin, waitForUser} from "/src/js/auth";
import {openTab} from "/src/js/tabs";
import {GeralDatabaseRef, getDataFromDatabase, hideItem, loading, showItem} from "/src/js/utils";
import {
    loadUsersOnUserPage,
    roleUserSelect,
    searchInput,
    stateUserSelect
} from "/src/js/pages/adminPage/adminUtils";
import {enviarErroParaSentry} from "/src/js/main";
import {createInstrucoesGeraisCard, loadInstrucoesGerais} from "/src/js/pages/common/instrucoesGerais";
import {ADMIN_HOME_PAGE_ADDRESS, USER_HOME_PAGE_ADDRESS} from "/src/js/pages/pages";

// Elementos //
export const instrucoesGeraisCardsAreaAdmin = document.getElementById("instrucoesGeraisCardsAreaAdmin");

/**
 * Carrega a aba de usuários.
 */
function loadUserTab() {
    showItem(loading);
    // Obtém todos os usuários
    loadUsersOnUserPage();
}

/**
 * Carrega os eventos(listeners) do site
 */
function loadEvents() {
    // Botões do tab-bar
    document.getElementById("geralAdminBtn").onclick = (event) => openTab("geralAdmin", event);
    document.getElementById("usuariosAdminBtn").onclick = (event) => {
        openTab("usuariosAdmin", event);
        loadUserTab();
    };
    document.getElementById("instrucoesGeraisAdminBtn").onclick = (event) => openTab("instrucoesGeraisAdmin", event);

    // Quando a busca atualizar
    searchInput.addEventListener("input", loadUsersOnUserPage.bind(null, false));
    // Quando o filtro de cargo atualizar
    roleUserSelect.addEventListener("change", loadUsersOnUserPage);
    // Quando o filtro de situação atualizar
    stateUserSelect.addEventListener("change", loadUsersOnUserPage);
}



/**
 * Carrega a página. Essa função deve ser chamada apenas após a verificação de permissão.
 */
async function loadPage() {
    showItem(loading);
    // Espera o usuário
    await waitForUser();

    // Se não for admin, apaga a página e redireciona pro homepage
    if (!isAdmin()) {
        removePage();
        window.location.href = USER_HOME_PAGE_ADDRESS;
    }

    loadEvents();
    loadInstrucoesGerais(instrucoesGeraisCardsAreaAdmin);
    hideItem(loading);
}

/**
 * Remove os elementos da página
 */
function removePage() {
    document.getElementById("adminPage").remove();
}

// Carrega a página
await loadPage();
