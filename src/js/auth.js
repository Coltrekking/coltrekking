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
    getDataFromDatabase, UsersDatabaseRef, refFromUser, getDataFromUser
} from "./utils"
import {abrirAlerta, abrirConfirmacao} from "./modal.js";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, deleteUser } from "firebase/auth";
import {child, set, update} from "firebase/database";
import {enviarErroParaSentry, identificarUserParaSentry} from "/src/js/main";
import {ADMIN_HOME_PAGE_ADDRESS, USER_HOME_PAGE_ADDRESS} from "/src/js/pages/pages";

// Lista de Cargos de um usuário
export const Roles = Object.freeze({  // O `Object.freeze()` certifica que não é possível atualizar
    UNDEFINED: undefined,                      // os cargos no meio da execução do site.
    USER: 'user',
    ADMIN: 'admin',
    SUPER: 'super'
    // Lembre-se: se adicionar um novo cargo, atualize a hierarquia dele em `RolesHierarchy` também!
});

const RolesHierarchy = Object.freeze({
    [Roles.UNDEFINED]: 0,
    [Roles.USER]: 1,
    [Roles.ADMIN]: 2,
    [Roles.SUPER]: 99 // cargo máximo
    // Se adicionar um novo cargo, defina a hierarquia dele aqui (quanto maior o número, mais poder)
});

// Domínio do email institucional do Coltec
const DOMINIO_COLTEC = "@teiacoltec.org";
// Email do site
const SITE_EMAIL = "sitecoltrekking@gmail.com";

// Traduz o conteúdo do site para português
Auth.languageCode = 'pt-BR';

// Cargo do usuário (variável que serve como um cache,
// para não precisar fazer pedidos frequentes ao banco de dados)
let currentUserRole = null;

// Promise que resolve quando o usuário é carregado
let userLoadedPromise = null;
let resolveUserLoaded = null;

// Carrega o usuário
// await waitForUser(); // Removido para evitar bloquear o carregamento do módulo
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
                const snapshot = await getDataFromUser(Auth.currentUser.uid);
                updateUserRoleVar(snapshot);
                return true;
            } catch (error) {
                // Pode ocorrer dessa função (tryToGetUser) ser chamada antes do usuário ser carregado,
                // o que pode gerar um erro de permissão negada. Se for esse o caso, apenas retorna false
                // para tentar novamente depois de um tempo. Se for outro tipo de erro, loga no console
                // e envia para o Sentry.
                if (!error.message.includes("Permission denied")) {
                    console.error("Erro ao obter cargo do usuário: " + error);
                    enviarErroParaSentry(error);
                }
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
 * @return {Roles | String} cargo do usuário logado.
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

/**
 * Função que permite o user sair de sua conta
 */
export function userSignOut() {
    signOut(Auth).then(function() {
        localStorage.removeItem("isLogged");
        window.location.href = '/';
    }).catch(function(error) {
        showError("Erro ao sair: ", error);
    });
}

/**
 * Função chamada após o usuário fazer login (pelo signInWithPopup
 * ou signInWithRedirect).
 * @private
 */
async function _onSignIn() {
    // Desaparece o carregamento (essa função ser chamada aqui
    // só é necessária quando o login é feito pelo signInWithRedirect)
    hideItem(loading);

    await waitForUser();

    let hasAdminPower = currentUserHasAdminPower();
    if (hasAdminPower) {
       if (!window.location.href.includes("homeAdmin"))
           window.location.href = ADMIN_HOME_PAGE_ADDRESS;
    } else {
       if (!window.location.href.includes("homePage"))
           window.location.href = USER_HOME_PAGE_ADDRESS;
    }
}

/**
 * Função que permite o login com a conta do Google
 */
export function signInWithGoogle() {
    showItem(loading);

    const provider = new GoogleAuthProvider;

    // NOTA: em alguns navegadores com o Safari (principalmente no mobile),
    // o signInWithPopup pode não funcionar. Para isso, no catch, há um
    // signInWithRedirect.
    signInWithPopup(Auth, provider)
        .then(async _result => {
            await _onSignIn();
            hideItem(loading);
        })
        .catch(error => {
            const errosParaLoginComRedirect = [
                'auth/popup-blocked',
                //'auth/cancelled-popup-request', (esse é enviado em algumas vezes que a pessoa fecha o popup manualmente)
                'auth/web-storage-unsupported'
            ]
            // Se der erro de popup, usa o signInWithRedirect
            if (errosParaLoginComRedirect.includes(error.code)) {
                signInWithRedirect(Auth, provider).catch(error => {
                    hideItem(loading);
                    showError("Erro ao redirecionar e logar com o Google (isso não deveria acontecer, pois é logado no signInWithRedirect). Mensagem de erro: ", error);
                });
            } else {
                hideItem(loading);
                showError("Erro ao logar com o Google: ", error);
            }
        });
}

/**
 * Função que exclui a conta do usuário
 */
export async function deleteAccount() {
    let confirmation = await abrirConfirmacao("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.");
    if (confirmation) {
        showItem(loading);
        deleteUser(Auth.currentUser).then(function() {
            abrirAlerta("Conta excluída com sucesso!");
            window.location.href = '/';
        }).catch(function(error) {
            showError("Erro ao excluir conta: ", error);
        }).finally(function() {
            hideItem(loading);
        });
    }
}

/**
 * Retorna o poder hierárquico de um cargo. Se o cargo não existir, retorna -1.
 * @param {String} role cargo a ser verificado
 * @return {number} poder hierárquico do cargo (quanto maior, mais poder), ou -1 se o cargo for inválido.
 */
export function getRolePower(role) {
    return RolesHierarchy[role] || -1;
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
    return getRolePower(role) >= getRolePower(Roles.ADMIN);
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

                // Verifica se o email é válido
                if (!isEmailValid(userEmail)) {
                    logOutUserWithAlert("Acesso negado. Conta não autorizada. Por favor, use um email institucional (@teiacoltec.org) para se autenticar.");
                }
            } else {
                const currentPath = window.location.pathname;

                if (!currentPath.includes("index") && currentPath !== "/" ) {
                   window.location.href = "/";
                }
            }
        }
    );
}

/**
 * Verifica se o email dado é valido.
 * O email é válido se:
 * - terminar com o domínio institucional do Coltec
 * - for a conta do site (sitecoltrekking@gmail.com)
 * @param email email a verificar
 * @return {boolean} se o email é válido ou não
 */
function isEmailValid(email) {
    // Verifica se o email termina com o endereço de email institucional
    if (email.endsWith(DOMINIO_COLTEC))
        return true;

    // Se chegou até aqui, não termina com o domínio do coltec //

    // Se for a conta do site coltrekking, também é válida
    if (email === SITE_EMAIL)
        return true;

    // Se chegou até aqui, não é válido
    return false;
}

/**
 * Desloga o usuário e exibe um alerta.
 * @param message {String} mensagem a ser exibida no alerta. Se não for definida, será exibida uma mensagem padrão.
 */
let _hasLoggedOut = false; // variável para evitar múltiplos alertas/deslogamentos
function logOutUserWithAlert(message) {
    if (_hasLoggedOut) return;
    _hasLoggedOut = true;
    abrirAlerta(message).then(_ => {
        // Desloga o usuário
        userSignOut();
        // Redireciona o usuário para a página de login
        const currentPath = window.location.pathname;

        if (!currentPath.includes("index") && currentPath !== "/" ) {
            window.location.href = "/";
        }
    });
}

// Função que centraliza e trata a autenticação
onAuthStateChanged(Auth, (user) => {
    hideItem(loading);
    _hasLoggedOut = false;
    if (user) {
        // Verifica se a conta é válida
        checkAuth();
        if (!isEmailValid(user.email)) { // Esse if já existe no checkAuth(), mas coloquei aqui para evitar problemas
            logOutUserWithAlert("Acesso negado. Conta não autorizada. Por favor, use um email institucional (@teiacoltec.org) para se autenticar.");
            return;
        }

        // Se chegou aqui, o email é válido //

        // Define que está logado
        localStorage.setItem("isLogged", "true");
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

                // Atualiza a pontuação na tela (se houver elemento)
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

        // Se o usuário deslogou, redirecio
        // na para a página de login (se não estiver)
        const currentPath = window.location.pathname;


        if (!currentPath.includes("index") && currentPath !== "/" ) {
            window.location.href = "/";
        }
    }
});

// Tratamento da autenticação **usando o signInWithRedirect**.
// O onAuthStateChanged() também é chamado normalmente, mas o _onSignIn()
// não é chamado no signInWithRedirect -- por isso, ele é chamado aqui.
getRedirectResult(Auth)
    .then(credential => {
        if (credential)
            _onSignIn().then( );
    })
    .catch(error => {
        showError("Erro no login com Google usando redirect: ", error);
    });