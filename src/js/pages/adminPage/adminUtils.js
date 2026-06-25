/**
 * Funções uteis para a página de administração.
 *
 * @author André Dias
 * @since 2026-06
 */
import {
    getDataFromDatabase,
    hideLoading,
    refFromUser,
    showLoading, UsersDatabaseRef,
} from "/src/js/utils";
import {abrirAlerta, abrirAviso} from "/src/js/modal";
import {enviarErroParaSentry} from "/src/js/main";
import {getRolePower, Roles} from "/src/js/auth";
import {update} from "firebase/database";
import {isEqual} from 'lodash'; // Para comparar arrays de objetos no loadUsersOnUserPage


// Elementos //
const userList = document.getElementById("userList");

export const searchInput = document.getElementById("userSearch");
export const roleUserSelect = document.getElementById("userSearchRole");
export const stateUserSelect = document.getElementById("userSearchState");

// Constante para o valor "todos" nos filtros de select ("seleciona todos").
// Deve ser o mesmo valor que está no html!
const TODOS_SELECT = "todos";

// A última lista de usuários carregada. Usada para evitar recarregar atoa
let ultimaListaUsuarios = null

/**
 * Carrega os usuários na página de usuários
 * @param shouldShowLoading se deve mostrar a tela de carregamento para o usuário
 */
export function loadUsersOnUserPage(shouldShowLoading = true) {
    //userList.innerHTML = "<p>Carregando usuários...</p>";
    if(shouldShowLoading) showLoading();

    // Obtém o filtro de pesquisa
    const searchTerm =
        searchInput?.value.trim().toLowerCase() || "";

    // Obtém o filtro de cargo
    const roleTerm =
        roleUserSelect?.value.trim() || TODOS_SELECT;

    const stateTerm =
        stateUserSelect?.value.trim() || TODOS_SELECT;

    // Percorre cada usuário no banco de dados
    getDataFromDatabase(UsersDatabaseRef)
        .then(snapshot => {
            const users = [];

            snapshot.forEach(childSnap => {
                const user = childSnap.val();
                const uid = childSnap.key;

                // Filtra pelo início do nome
                if (searchTerm && !user.nome?.toLowerCase().includes(searchTerm)) {
                    return;
                }

                // Filtra pelo cargo
                if (roleTerm !== TODOS_SELECT) {
                    if (user.role !== roleTerm)
                        if ( !(user.role === Roles.SUPER && roleTerm === Roles.ADMIN) ) // Se o cargo for SUPER, ele também deve aparecer quando o filtro for ADMIN
                            return;
                }

                // Filtra pela situação
                if (stateTerm !== TODOS_SELECT) {
                    // Se o usuário está desbloqueado mas estamos procurando pelas pessoas bloquueadas
                    if (user.able && stateTerm === "blocked")
                        return
                    // Se o usuário está desbloqueado mas estamos procurando pelas pessoas bloquueadas
                    if ((!user.able && stateTerm === "unblocked") )
                        return
                }

                users.push({ ...user, uid });
            });

            // Ordenação alfabética pelo nome
            users.sort((a, b) => {
                return (a.nome || "").localeCompare(b.nome || "");
            });


            if (ultimaListaUsuarios && isEqual(users, ultimaListaUsuarios))
                return;

            ultimaListaUsuarios = users;

            // Limpa a lista logo antes de renderizar
            userList.innerHTML = "";

            // Renderiza os usuários
            users.forEach(user => {
                const userCard = createRowOnUserSection(user);
                userList.appendChild(userCard);
            });

            // Caso não encontre nenhum usuário
            if (users.length === 0) {
                userList.innerHTML = "<p>Nenhum usuário encontrado.</p>";
            }
        })
        .catch(err => {
            console.error("Erro ao carregar usuários:", err);
            enviarErroParaSentry(err);
        })
        .finally(_ => {
            if (shouldShowLoading) hideLoading()
        });
}



/**
 * Cria uma linha para a seção de usuários.
 * Função criada apenas para deixar o código mais limpo.
 * @param user usuário que se quer criar a seção
 * @return {HTMLDivElement} Linha criada
 */
function createRowOnUserSection(user) {
    const userCard = document.createElement("div");
    userCard.className = "user-card";

    const row = document.createElement("div");
    row.className = "user-row";

    const actionsDiv = document.createElement("div");

    const nameElem = document.createElement("span");
    nameElem.textContent = user.nome || "---";
    row.appendChild(nameElem);

    // Botão de cargo //
    let roleBtn = document.createElement("button");
    // Se o usuário tiver cargo SUPER, o cargo dele não pode ser alterado.
    if (getRolePower(user.role) !== getRolePower(Roles.SUPER)) {
        if (getRolePower(user.role) < getRolePower(Roles.ADMIN)) {
            roleBtn.textContent = "Promover a Admin";
            roleBtn.className = "primary";
            roleBtn.onclick = () => promoteToAdmin(user.uid);
        } else {
            roleBtn.textContent = "Remover Admin";
            roleBtn.className = "danger";
            roleBtn.onclick = () => demoteFromAdmin(user.uid);
        }
    } else {
        roleBtn.textContent = "Sem Permissão";
        roleBtn.className = "unable";
        roleBtn.onclick = () => abrirAviso("Este usuário tem o cargo máximo e não pode ser promovido ou rebaixado.");
    }

    // Botão de bloqueio //
    let blockBtn = document.createElement("button");
    if (user.able === false) {
        blockBtn.textContent = "Desbloquear";
        blockBtn.className = "primary";
        blockBtn.onclick = () => unblockUser(user.uid);
    } else {
        blockBtn.textContent = "Bloquear";
        blockBtn.className = "danger";
        blockBtn.onclick = () => blockUser(user.uid);
    }

    actionsDiv.appendChild(roleBtn);
    actionsDiv.appendChild(blockBtn);
    row.appendChild(actionsDiv);
    userCard.appendChild(row);
    return userCard;
}

// Função para promover um usuário a admin
function promoteToAdmin(uid) {
    update(refFromUser(uid), { role: Roles.ADMIN })
        .then(() => {
            abrirAlerta("Usuário promovido a admin!").then();
            loadUsersOnUserPage(false); // Atualiza a lista
        })
        .catch(err => {
            console.error("Erro ao promover usuário:", err);
            enviarErroParaSentry(err);
        });
}

// Função para remover a role de admin
function demoteFromAdmin(uid) {
    update(refFromUser(uid), { role: Roles.USER })
        .then(() => {
            abrirAlerta("Admin removido!").then();
            loadUsersOnUserPage(false); // Atualiza a lista
        })
        .catch(err => {
            console.error("Erro ao remover admin:", err);
            enviarErroParaSentry(err);
        });
}

// Função para bloquear usuário
function blockUser(uid) {
    update(refFromUser(uid), { able: false })
        .then(() => {
            abrirAlerta("Usuário bloqueado com sucesso!").then();
            loadUsersOnUserPage(false);
        })
        .catch(err => {
            console.error("Erro ao bloquear usuário:", err);
            enviarErroParaSentry(err);

            abrirAlerta("Erro ao bloquear usuário. Verifique permissões.").then();
        });
}

// Função para desbloquear usuário
function unblockUser(uid) {
    update(refFromUser(uid), { able: true })
        .then(() => {
            abrirAlerta("Usuário desbloqueado com sucesso!").then();
            loadUsersOnUserPage(false);
        })
        .catch(err => {
            console.error("Erro ao desbloquear usuário:", err);
            enviarErroParaSentry(err);
            abrirAlerta("Erro ao desbloquear usuário. Verifique permissões.").then();
        });
}