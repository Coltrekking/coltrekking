/**
 * Código responsável pela lógica de autenticação/conta/perfil do site.
 */
import {Auth} from "../config/firebase";
import {
    hideItem,
    loading,
    showUserContent,
    showItem,
    showAuth,
    showError,
    refFromDatabase,
    getDataFromDatabase, UsersDatabaseRef, refFromUser
} from "./utils"

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, deleteUser, reload } from "firebase/auth";
import {child, set, update} from "firebase/database";
import {enviarErroParaSentry, identificarUserParaSentry} from "/src/js/main";

// Lista de Cargos de um usuário
const Roles = Object.freeze({  // O `Object.freeze()` certifica que não é possível atualizar
    UNDEFINED: undefined,                      // os cargos no meio da execução do site.
    USER: 'user',
    ADMIN: 'admin'
    // Lembre-se: se adicionar um novo cargo, atualize a função currentUserHasAdminPower() para refletir o poder desse novo cargo!
});

// Traduz o conteúdo do site para português
Auth.languageCode = 'pt-BR';

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
    currentUserRole = snapshot.val()?.role || Roles.USER;

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
            try {
                const snapshot = await getDataFromDatabase('users/' + Auth.currentUser.uid);
                updateUserRoleVar(snapshot);
                return true;
            } catch (error) {
                console.error("Erro ao obter cargo do usuário: " + error);
                enviarErroParaSentry(error);
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
 * Caso o usuário/seu cargo não tenha sido definido/obtido ainda, tenta obter
 * o seu cargo do banco de dados (essa ação pode demorar um pouco). Caso o
 * cargo já tenha sido obtido, a função parará.
 *
 * Se múltiplas chamadas são feitas enquanto o usuário está sendo carregado,
 * todas aguardarão pelo mesmo resultado sem fazer requisições duplicadas.
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
            currentUserRole = Roles.UNDEFINED;
            console.warn("Não foi possível carregar o usuário!");
            if (resolveUserLoaded) {
                resolveUserLoaded(Roles.UNDEFINED);
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
 * Obtém o cargo do usuário logado. Se o cargo ainda não tiver sido carregado, retorna o cargo "indefinido".
 * @return {Roles} cargo do usuário logado.
 */
export function getUserRole() {
    return currentUserRole;
}

/**
 * Retorna se o usuário logado é administrador/tem poderes de admin ou não.
 * @return {boolean} se o usuário logado é admin.
 */
export function isAdmin() {
    return currentUserHasAdminPower();
}

// Função que centraliza e trata a autenticação
onAuthStateChanged(Auth, (user) => {
    hideItem(loading);
    if (user) {
        checkAuth();
        getDataFromDatabase(UsersDatabaseRef, user.uid)
        .then(snapshot => {
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



                return set(child(UsersDatabaseRef, user.uid), userData).then(() => {
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
                    return update(refFromUser(user.uid), updates).then(() => {
                        console.log('Dados de usuário atualizados:', updates);
                        return data;
                    });
                }

                return data;
            }
        })
        .then(userData => {
            // Identifica o usuário para o Sentry
            identificarUserParaSentry(user.uid, user.email, userData);

            // Salva UID no localStorage
            localStorage.setItem('uid', user.uid);

            // 🔢 Atualiza a pontuação na tela (se houver elemento)
            const pontosEl = document.getElementById('userPoints');
            if (pontosEl) {
                pontosEl.innerHTML = `Pontuação: ${userData.pontos || 0}`;
            }

            // Exibe o conteúdo normal
            showUserContent(user, userData.role, userData.able);
        })
            .catch(error => {
                enviarErroParaSentry(error);
                console.error("Erro ao ler/criar usuário:", error);
            });

    } else {
        localStorage.removeItem('uid');
        showAuth();
    }
});

/**
 * Função que permite o user sair de sua conta
 */
export function userSignOut() {
    signOut(Auth).then(function() {
        window.location.href = 'index.html';
    }).catch(function(error) {
        showError("Erro ao sair: ", error);
    });
}

/**
 * Função que permite o login com a conta do Google
 */
export function signInWithGoogle() {
    showItem(loading);

    const provider = new GoogleAuthProvider;

    signInWithPopup(Auth, provider)
        .then(result => {
            const user = result.user;

            // Pega o role do usuário
            return getDataFromDatabase(refFromUser(user.uid), '/role');
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

/**
 * Função que exclui a conta do usuário
 */
export function deleteAccount() {
    let confirmation = confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.");
    if (confirmation) {
        showItem(loading);
        deleteUser(Auth.currentUser).then(function() {
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
    reload(user).then(() => {
        const uid = user.uid;

        // Verifica role do usuário atual
        getDataFromDatabase(refFromUser(uid), '/role')
            .then(_snap => {
                if (!currentUserHasAdminPower()) {
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
            }
        )
            .catch(err => {
                console.error("Erro ao verificar role:", err);
                enviarErroParaSentry(err);

            }
        );
    });
}

// Função que carrega todos os usuários do BD
export function loadUsers() {
    const userList = document.getElementById("userList");
    userList.innerHTML = "<p>Carregando usuários...</p>";

    const searchTerm =
        document.getElementById("userSearch")?.value.trim().toLowerCase() || "";

    getDataFromDatabase(refFromDatabase("users"))
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
        .catch(err => {
            console.error("Erro ao carregar usuários:", err);
            enviarErroParaSentry(err);

        });
}

// Função para promover um usuário a admin
function promoteToAdmin(uid) {

    update(refFromUser(uid), { role: Roles.ADMIN })
        .then(() => {
            alert("Usuário promovido a admin!");
            loadUsers(); // atualiza a lista
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
            alert("Admin removido!");
            loadUsers(); // atualiza a lista
        })
        .catch(err => {
            console.error("Erro ao remover admin:", err);
            enviarErroParaSentry(err);

        });
}

/**
 * Verifica se o usuário atual tem poder de admin (ou seja, se ele é,
 * pelo menos, admin). Se o usuário for um cargo maior que admin, essa
 * função também retornará verdadeiro.
 * Se o usuário ainda não tiver sido carregado, a função retornará falso.
 * @returns {boolean} se o usuário tem poder de admin.
 */
export function currentUserHasAdminPower() {
    return hasAdminPower(currentUserRole);
}

/**
 * Verifica se o cargo tem poder de admin (ou seja, se ele é, pelo menos, admin).
 * @param role Cargo do usuário a ser verificado.
 * @returns {boolean} se o usuário tem poder de admin.
 */
export function hasAdminPower(role) {
    return role === Roles.ADMIN;
}

/**
 * Verifica se o usuário está autenticado e se seu email é institucional `(@teiacoltec.org)`.
 * Se não estiver autenticado, redireciona para a página de login. Se estiver autenticado
 * mas o email não for institucional, exibe um alerta e desloga o usuário.
 */
export function checkAuth() {
    waitForUser() // Espera o usuário ser carregado
        .then(()=> {
            const user = Auth.currentUser;
            if (user) {
                const userEmail = user.email;

                // Verifica se o email termina com o endereço de email institucional
                if (!userEmail.endsWith("@teiacoltec.org")) {
                    alert("Acesso negado. Conta não autorizada. Por favor, use um email institucional (@teiacoltec.org) para se autenticar.");
                    userSignOut();
                }
            } else {
                window.location.href = "index.html";
            }
        }
    );
}