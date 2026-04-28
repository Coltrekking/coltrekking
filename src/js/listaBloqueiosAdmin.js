import {Auth} from "../config/firebase";
import {getDataFromDatabase, getDataFromUser, refFromUser, UsersDatabaseRef} from "/src/js/utils";
import {currentUserHasAdminPower, hasAdminPower} from "/src/js/auth";
import {update} from "firebase/database";

// abre/fecha a área de gerenciamento de bloqueios
export function toggleBlockManager() {
    const div = document.getElementById("blockManager");
    const btn = document.querySelector("button[onclick='toggleBlockManager()']"); // pega o botão
    const user = Auth.currentUser;

    if (!user) {
        alert("Você precisa estar logado para gerenciar bloqueios.");
        return;
    }

    user.reload().then(() => {
        const uid = user.uid;

        getDataFromUser(uid)
            .then(snap => {
                if (!currentUserHasAdminPower()) {
                    alert("Você não tem permissão para gerenciar bloqueios.");
                    return;
                }

                if (div.style.display === "none" || div.style.display === "") {
                    div.style.display = "block";
                    if (btn) btn.textContent = "Fechar"; // muda texto
                    loadBlockManager();
                } else {
                    div.style.display = "none";
                    if (btn) btn.textContent = "Gerenciar Bloqueios"; // volta ao original
                }
            })
            .catch(err => {
                console.error("Erro ao verificar role (toggleBlockManager):", err);
                alert("Erro ao verificar permissões. Tente novamente.");
            });
    });
}

// carrega todos os usuários com botões de bloquear/desbloquear
export function loadBlockManager() {
    const blockList = document.getElementById("blockList");
    blockList.innerHTML = "<p>Carregando usuários...</p>";

    const searchTerm = document.getElementById("blockSearch")?.value.trim().toLowerCase() || "";

    getDataFromDatabase(UsersDatabaseRef)
        .then(snapshot => {
            blockList.innerHTML = ""; // limpa antes de popular

            const users = [];

            snapshot.forEach(childSnap => {
                const user = childSnap.val();
                const uid = childSnap.key;

                // Ignora admins
                if (hasAdminPower(user)) return;

                // Filtra pelo início do nome
                if (searchTerm && !user.nome.toLowerCase().startsWith(searchTerm)) {
                    return;
                }

                users.push({ ...user, uid });
            });

            // Ordena: bloqueados primeiro, depois alfabética
            users.sort((a, b) => {
                if (a.able === false && b.able !== false) return -1; // bloqueado primeiro
                if (a.able !== false && b.able === false) return 1;  // desbloqueado depois
                return (a.nome || "").localeCompare(b.nome || "");   // ordem alfabética
            });

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
                if (user.able === false) {
                    actionBtn = document.createElement("button");
                    actionBtn.textContent = "Desbloquear";
                    actionBtn.className = "primary";
                    actionBtn.onclick = () => unblockUser(user.uid);
                } else {
                    actionBtn = document.createElement("button");
                    actionBtn.textContent = "Bloquear";
                    actionBtn.className = "danger";
                    actionBtn.onclick = () => blockUser(user.uid);
                }

                row.appendChild(actionBtn);
                userCard.appendChild(row);
                blockList.appendChild(userCard);
            });

            // Caso não encontre nenhum usuário
            if (users.length === 0) {
                blockList.innerHTML = "<p>Nenhum usuário encontrado.</p>";
            }
        })
        .catch(err => console.error("Erro ao carregar usuários para bloqueio:", err));
}

// função para bloquear usuário
function blockUser(uid) {
    update(refFromUser(uid), { able: false })
        .then(() => {
            alert("Usuário bloqueado com sucesso!");
            loadBlockManager();
        })
        .catch(err => {
            console.error("Erro ao bloquear usuário:", err);
            alert("Erro ao bloquear usuário. Verifique permissões.");
        });
}

// função para desbloquear usuário
function unblockUser(uid) {
    update(refFromUser(uid), { able: true })
        .then(() => {
            alert("Usuário desbloqueado com sucesso!");
            loadBlockManager();
        })
        .catch(err => {
            console.error("Erro ao desbloquear usuário:", err);
            alert("Erro ao desbloquear usuário. Verifique permissões.");
        });
}
