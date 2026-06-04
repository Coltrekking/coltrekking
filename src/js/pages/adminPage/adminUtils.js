/**
 * Funções uteis para a página de administração.
 *
 * @author André Dias
 * @since 2024-06
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

const userList = document.getElementById("userList");

export const searchInput = document.getElementById("userSearch");
export const roleUserSelect = document.getElementById("userSearchRole");

// Constante para o valor "todos" no filtro de cargo.
// Deve ser o mesmo valor que está no html
const TODOS_ROLE_SELECT = "todos";

export function loadUsersOnUserPage(shouldShowLoading = true) {
    //userList.innerHTML = "<p>Carregando usuários...</p>";
    if(shouldShowLoading) showLoading();

    const searchTerm =
        searchInput?.value.trim().toLowerCase() || "";

    const roleTerm =
        roleUserSelect?.value.trim() || TODOS_ROLE_SELECT;

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
                if (roleTerm !== TODOS_ROLE_SELECT) {
                    if (user.role !== roleTerm)
                        if ( !(user.role === Roles.SUPER && roleTerm === Roles.ADMIN) ) // Se o cargo for SUPER, ele também deve aparecer quando o filtro for ADMIN
                            return;
                }

                users.push({ ...user, uid });
            });

            // Ordenação alfabética pelo nome
            users.sort((a, b) => {
                return (a.nome || "").localeCompare(b.nome || "");
            });

            // Limpa a lista logo antes de renderizar
            userList.innerHTML = "";

            // Renderiza os usuários
            users.forEach(user => {
                const userCard = document.createElement("div");
                userCard.className = "user-card";

                const row = document.createElement("div");
                row.className = "user-row";

                const nameElem = document.createElement("span");
                nameElem.textContent = user.nome || "---";
                row.appendChild(nameElem);

                let actionBtn;
                actionBtn = document.createElement("button");
                // Se o usuário tiver cargo SUPER, o cargo dele não pode ser alterado.
                if (getRolePower(user.role) !== getRolePower(Roles.SUPER)) {
                    if (getRolePower(user.role) < getRolePower(Roles.ADMIN)) {
                        actionBtn.textContent = "Promover a Admin";
                        actionBtn.className = "primary";
                        actionBtn.onclick = () => promoteToAdmin(user.uid);
                    } else {
                        actionBtn.textContent = "Remover Admin";
                        actionBtn.className = "danger";
                        actionBtn.onclick = () => demoteFromAdmin(user.uid);
                    }
                } else {
                    actionBtn.textContent = "Sem Permissão";
                    actionBtn.className = "unable";
                    actionBtn.onclick = () => abrirAviso("Este usuário tem o cargo máximo e não pode ser promovido ou rebaixado.");
                }

                row.appendChild(actionBtn);
                userCard.appendChild(row);
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

// Função para promover um usuário a admin
function promoteToAdmin(uid) {
    update(refFromUser(uid), { role: Roles.ADMIN })
        .then(() => {
            abrirAlerta("Usuário promovido a admin!").then();
            loadUsersOnUserPage(); // Atualiza a lista
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
            loadUsersOnUserPage(); // Atualiza a lista
        })
        .catch(err => {
            console.error("Erro ao remover admin:", err);
            enviarErroParaSentry(err);
        });
}