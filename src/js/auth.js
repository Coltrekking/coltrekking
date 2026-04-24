import {Auth, Database} from "../config/firebase";
import {hideItem, loading, showUserContent, showItem, showAuth, showError, getRefFromDatabase} from "./utils"

import { GoogleAuthProvider } from "firebase/auth";



// Cargo do usuário
const Role = Object.freeze({
    UNDEFINED: undefined,
    USER: 'user',
    ADMIN: 'admin'
});

// Traduz o conteúdo do site para português
Auth.languageCode = 'pt-BR';

// Administradores do sistema
let adminEmails = [
    "a2023952624@teiacoltec.org",
    "hh@teiacoltec.org"
];

// Cargo do usuário (variável que serve como um cache,
// para não precisar fazer pedidos frequentes ao banco de dados)
let currentUserRole = null;

// Promise que resolve quando o usuário é carregado
let userLoadedPromise = null;
let resolveUserLoaded = null;

// Carrega o usuário
await waitForUser();
// Verifica se ele está autenticado
checkAuth()

/**
 * Atualiza a variável `currentUserRole` e resolve todas as promises pendentes.
 * @param snapshot data do usuário
 */
function updateUserRoleVar(snapshot) {
    currentUserRole = snapshot.val()?.role || Role.USER;

    // Resolve a promise se existir
    if (resolveUserLoaded) {
        resolveUserLoaded(currentUserRole);
        resolveUserLoaded = null;
        userLoadedPromise = null;
    }
}

/**
 * Tentativa de obter o usuário (da função `waitForUser()`).
 *
 * **Não chame essa função diretamente!** Opte pela `waitForUser()`;
 * @returns {Promise<boolean>} true se conseguiu obter, false caso contrário
 */
async function tryToGetUser() {
    // Verifica se o cargo não foi obtido
    if (currentUserRole === null) {
        // Se não foi obtido, tenta obter a partir do banco de dados
        if (Auth.currentUser) {
            const userRef = Database.ref('users/' + Auth.currentUser.uid); //getRefFromDatabase("users/" + Auth.currentUser.uid);

            try {
                const snapshot = await userRef.once('value');
                updateUserRoleVar(snapshot);
                return true;
            } catch (error) {
                console.error("Erro ao obter cargo do usuário: " + error);
                return false;
            }
        } else {
            // Se currentUser não existe ainda, não conseguiu
            return false;
        }
    } else {
        // Já foi obtido
        return true;
    }
}

/**
 * Função usada para obter o cargo do usuário e, portanto, **o usuário** (pois
 * só é possível obter o cargo do usuário se sua referência estiver carregada).
 * Após obter o usuário, verifica se ele está logado de forma válida _(email
 * institucional, por exemplo)_.
 *
 * É interessante e recomendável usar essa função na hora de **carregar a página**,
 * por exemplo, pois há chance do usuário e seu cargo não terem sido obtidos
 * ainda.
 *
 * Obtém o usuário (principalmente seu cargo). Caso não tenha sido definido/obtido,
 * ainda, o seu cargo, tenta obter o seu cargo do banco de dados (essa ação pode
 * demorar um pouco). Caso o cargo já tenha sido obtido, a função parará.
 *
 * Se múltiplas chamadas são feitas enquanto o usuário está sendo carregado,
 * todas aguardarão pelo mesmo resultado sem fazer requisições duplicadas.
 *
 *
 * @param {?number} tries quantas tentativas até desistir de obter o cargo. Por padrão,
 * são 100 tentativas com 0,1 segundos de diferença (gerando 10s de espera no máximo).
 * @returns {Promise<string>} Promise que resolve com o cargo do usuário
 */
export async function waitForUser(tries = 100) {
    // Se o usuário já foi carregado, retorna imediatamente
    if (currentUserRole !== null) {
        return currentUserRole;
    }

    // Se já existe uma promise pendente, aguarda por ela
    if (userLoadedPromise !== null) {
        return userLoadedPromise;
    }

    /* Se chegou até aqui, ainda não existe uma tentativa para tentar
       obter o usuário */

    // Cria uma promise que será resolvida quando o usuário for carregado.
    userLoadedPromise = new Promise(resolve => {
        resolveUserLoaded = resolve;
    });

    // Função auxiliar para tentar obter o usuário com delay
    const tryWithDelay = async (remainingTries) => {
        if (remainingTries <= 0) {
            currentUserRole = Role.UNDEFINED;
            console.warn("Não foi possível carregar o usuário!");
            if (resolveUserLoaded) {
                resolveUserLoaded(Role.UNDEFINED);
                resolveUserLoaded = null;
                userLoadedPromise = null;
            }
            return;
        }

        // Tenta obter o usuário
        const success = await tryToGetUser();
        if (success) {
            // Sucesso, a promise já foi resolvida em updateUserRoleVar
            return;
        }

        // Se não conseguiu, espera 100ms e tenta novamente
        setTimeout(() => tryWithDelay(remainingTries - 1), 100);
    };

    // Inicia as tentativas
    await tryWithDelay(tries);

    return userLoadedPromise;
}

/**
 * Retorna se o usuário logado é administrador ou não.
 * @return {boolean} se o usuário logado é admin.
 */
export function isAdmin() {
    return currentUserRole === Role.ADMIN;
}

//função que centraliza e trata a autenticação
Auth.onAuthStateChanged(function(user) {
    hideItem(loading);

    if (user) {
        const userRef = Database.ref('users/' + user.uid);

        userRef.once('value').then(snapshot => {
            updateUserRoleVar(snapshot);

            if (!snapshot.exists()) {
                // Cria usuário com role "user" e able: true por padrão
                const userData = {
                    uid: user.uid,
                    nome: user.displayName || '',
                    email: user.email,
                    role: "user",
                    able: true,
                    pontos: 0 // <-- novo campo de pontuação inicial
                };
                return userRef.set(userData).then(() => {
                    console.log('Usuário criado com sucesso!');
                    return userData;
                });
            } else {
                const data = snapshot.val();
                let updates = {};

                // Se não tiver role, define como "user"
                if (!data.role) {
                    updates.role = "user";
                    data.role = "user";
                }

                // Se não tiver o campo able, define como true
                if (data.able === undefined) {
                    updates.able = true;
                    data.able = true;
                }

                // Se não tiver o campo pontos, inicia com 0
                if (data.pontos === undefined) {
                    updates.pontos = 0;
                    data.pontos = 0;
                }

                if (Object.keys(updates).length > 0) {
                    return userRef.update(updates).then(() => {
                        console.log('Dados de usuário atualizados:', updates);
                        return data;
                    });
                }

                return data;
            }
        }).then(userData => {
            // Salva UID no localStorage
            localStorage.setItem('uid', user.uid);

            // 🔢 Atualiza a pontuação na tela (se houver elemento)
            const pontosEl = document.getElementById('userPoints');
            if (pontosEl) {
                pontosEl.innerHTML = `Pontuação: ${userData.pontos || 0}`;
            }

            // Exibe o conteúdo normal
            showUserContent(user, userData.role, userData.able);
        }).catch(error => {
            console.error("Erro ao ler/criar usuário:", error);
        });

    } else {
        localStorage.removeItem('uid');
        showAuth();
    }
});

//função que permite o user sair de sua conta
function signOut() {
    Auth.signOut().then(function() {
        window.location.href = 'index.html';
    }).catch(function(error) {
        showError("Erro ao sair: ", error);
    });
}

//função que permite o login com a conta do Google
export function signInWithGoogle() {
    showItem(loading);

    const provider = new GoogleAuthProvider;

    Auth.signInWithPopup(provider)
        .then(result => {
            const user = result.user;
            const userRef = Database.ref('users/' + user.uid + '/role');

            // Pega o role do usuário
            return userRef.once('value');
        })
        .then(roleSnap => {
            const role = roleSnap.val();
            if (role === 'admin') {
                window.location.href = 'homeAdmin.html';
            } else {
                window.location.href = 'homePage.html';
            }
        })
        .catch(error => {
            showError("Erro ao logar com o Google: ", error);
        })
        .finally(() => {
            hideItem(loading);
        });
}

//função que exclui a conta do Usuário
export function deleteAccount() {
    let confirmation = confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.");
    if (confirmation) {
        showItem(loading);
        Auth.currentUser.delete().then(function() {
            alert("Conta excluída com sucesso!");
            window.location.href = 'index.html';
        }).catch(function(error) {
            showError("Erro ao excluir conta: ", error);
        }).finally(function() {
            hideItem(loading);
        });
    }
}

// Função que alterna a exibição da div de gerenciamento
export function toggleUserManager() {
    const div = document.getElementById("userManager");
    const btn = document.querySelector("button[onclick='toggleUserManager()']"); // botão
    const user = Auth.currentUser;

    if (!user) {
        alert("Você precisa estar logado para gerenciar usuários.");
        return;
    }

    // Recarrega info do usuário para garantir dados atualizados
    user.reload().then(() => {
        const uid = user.uid;

        // Verifica role do usuário atual
        Database.ref("users/" + uid).once("value")
            .then(snap => {
                const role = snap.val()?.role;
                if (role !== "admin") {
                    alert("Você não tem permissão para gerenciar usuários.");
                    return;
                }

                // Alterna a visibilidade da div
                if (div.style.display === "none" || div.style.display === "") {
                    div.style.display = "block";
                    if (btn) btn.textContent = "Fechar"; // muda o texto
                    loadUsers(); // carrega a lista de usuários
                } else {
                    div.style.display = "none";
                    if (btn) btn.textContent = "Gerenciar Usuários"; // volta ao original
                }
            })
            .catch(err => console.error("Erro ao verificar role:", err));
    });
}

// Função que carrega todos os usuários do BD
export function loadUsers() {
    const userList = document.getElementById("userList");
    userList.innerHTML = "<p>Carregando usuários...</p>";

    const searchTerm =
        document.getElementById("userSearch")?.value.trim().toLowerCase() || "";

    Database.ref("users").once("value")
        .then(snapshot => {
            userList.innerHTML = "";

            const users = [];

            snapshot.forEach(childSnap => {
                const user = childSnap.val();
                const uid = childSnap.key;

                // Filtra pelo início do nome
                if (searchTerm && !user.nome?.toLowerCase().startsWith(searchTerm)) {
                    return;
                }

                users.push({ ...user, uid });
            });

            // 🔤 ORDENAÇÃO ALFABÉTICA PELO NOME
            users.sort((a, b) => {
                return (a.nome || "").localeCompare(b.nome || "");
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
                if (user.role !== "admin") {
                    actionBtn = document.createElement("button");
                    actionBtn.textContent = "Promover a Admin";
                    actionBtn.className = "primary";
                    actionBtn.onclick = () => promoteToAdmin(user.uid);
                } else {
                    actionBtn = document.createElement("button");
                    actionBtn.textContent = "Remover Admin";
                    actionBtn.className = "danger";
                    actionBtn.onclick = () => demoteFromAdmin(user.uid);
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
        .catch(err => console.error("Erro ao carregar usuários:", err));
}

// Função para promover um usuário a admin
function promoteToAdmin(uid) {
    Database.ref("users/" + uid).update({ role: "admin" })
        .then(() => {
            alert("Usuário promovido a admin!");
            loadUsers(); // atualiza a lista
        })
        .catch(err => console.error("Erro ao promover usuário:", err));
}

// Função para remover a role de admin
function demoteFromAdmin(uid) {
    Database.ref("users/" + uid).update({ role: "user" })
        .then(() => {
            alert("Admin removido!");
            loadUsers(); // atualiza a lista
        })
        .catch(err => console.error("Erro ao remover admin:", err));
}

//verifica se o usuário está autenticado com a conta institucional (para evitar redirecionamento desnecessário para homePage)
//RESTRINGE PARA CONTA INSTITUCIONAL (@TEIACOLTEC.ORG)
export function checkAuth() {
    Auth.onAuthStateChanged(function(user) {
        if (user) {
            const userEmail = user.email;

            if (!userEmail.endsWith("@teiacoltec.org")) {
                alert("Acesso negado. Conta não autorizada. Por favor, use um email institucional (@teiacoltec.org) para se autenticar.");
                Auth.signOut();
            }
        } else {
            window.location.href = "index.html";
        }
    });
}