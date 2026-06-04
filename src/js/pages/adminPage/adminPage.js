/**
 * Página de administração.
 *
 * @author André Dias
 * @since 2024-06
 */
import {isAdmin, waitForUser} from "/src/js/auth";
import {openTab} from "/src/js/tabs";
import {hideItem, loading, showItem} from "/src/js/utils";
import {loadUsersOnUserPage, roleUserSelect, searchInput} from "/src/js/pages/adminPage/adminUtils";

function openBlockManager() {
    
}

/**
 * Carrega a aba de usuários.
 */
function loadUserTab() {
    showItem(loading);
    // Obtém todos os usuários
    loadUsersOnUserPage();
}

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
}

/**
 * Carrega a página. Essa função deve ser chamada apenas após a verificação de permissão.
 */
async function loadPage() {
    showItem(loading);
    // Espera o usuário
    await waitForUser();

    // Se for admin, carrega a página. Se não, mostra a mensagem de sem permissão.
    if (!isAdmin()) showNoPermission();

    loadEvents()
    hideItem(loading);
}

/**
 * Mostra a mensagem de sem permissão.
 */
function showNoPermission() {
    console.log("Sem permissão");
    document.getElementById("adminPage").remove();
}

// Carrega a página
await loadPage();
