import {Auth, Database} from "../config/firebase";
import {child, ref, get} from "firebase/database";
import {enviarErroParaSentry} from "/src/js/main";
import {getUserRole} from "/src/js/auth";
import {abrirAlerta} from "/src/js/modal";

// Referências dos elementos da página
export let loading = document.getElementById('loading');
export let authElement = document.getElementById('auth');
export let homePage = document.getElementById('homePage');
export let userEmail = document.getElementById('userEmail');
export let userImg = document.getElementById('userImg');
export let userName = document.getElementById('userName');
export let welcome_message = document.getElementById('mensagem-boas-vindas');
export let userRoleEl = document.getElementById('userRole');

export let userId = document.getElementById('userId');
export let userClass = document.getElementById('userClass');
export let userCourse = document.getElementById('userCourse');
export let editPersonalInfoForm = document.getElementById('editPersonalInfoForm');
export let editInfoSubmitBtn = document.getElementById("editInfoSubmitBtn");
export let editPersonalInfoModal = document.getElementById('editPersonalInfoModal');
// Guarda valores iniciais ao abrir o editor para poder restaurar caso o usuário cancele
export let editPersonalInfoInitial = { cpf: "", turma: "", curso: "" };

//definindo referências para os elementos do html de evento
export let eventForm = document.getElementById('eventForm');
export let submitEventForm = document.getElementById('submitEventForm');
export let editEventForm = document.getElementById('editEventForm');
export let eventContainer = document.getElementById('eventContainer');
export let eventCount = document.getElementById('eventCount');

export const EventsDatabaseRef = refFromDatabase("event/");
export const InscricoesDatabaseRef = refFromDatabase("inscricoes/");
export const PhotosDatabaseRef = refFromDatabase("photos/");
export const UsersDatabaseRef = refFromDatabase("users/");
// Remove elementos da aba
export function hideItem(item) {
    if (item && item.style) {
        item.style.display = 'none';
    }
}

// Oculta elementos da aba
export function showItem(item) {
    if (item && item.style) {
        let _loading = document.getElementById('loading'); // Para ter certeza que o loading
        if (_loading && item === _loading) item.style.display = 'flex';
        else item.style.display = 'block';
    }
}

/**
 * Mostra o elemento de loading, para indicar que algo está carregando.
 */
export function showLoading() {
    showItem(loading);
}

/**
 * Retira o elemento de loading.
 */
export function hideLoading() {
    hideItem(loading);
}

// Mostrar conteúdo para usuários não autenticados
export function showAuth() {
    hideItem(homePage);
    showItem(authElement);
}

/**
 * Retorna a referência da célula do banco de dados no caminho dado.
 * @param path caminho para a célula, como `users/AjdkaJDJId892` ou `event/`
 * @param chName nome da criança/atributo (por exemplo, `email` ou `uid`), se
 *        quiser um filho de `path`.
 * @returns DatabaseReference
 */
export function refFromDatabase(path, chName=null) {
    let refPath = path;
    // Se o caminho for uma string, converte para referência do banco de dados
    if (typeof path === 'string') refPath = ref(Database, path);

    if (chName === null) return refPath;

    // Se chegou até aqui, chName não é nulo
    return child(refPath, chName);
}

/**
 * Retorna uma promise com a informação guardada no caminho dado do banco de dados.
 * Note que essa função só vai retornar a informação uma vez (equivalente ao `once`/`get` do Firebase).
 * @param path Caminho para a informação (ou para o pai dela, se for) em formato de string
 *             ou referência. Caso tenha o caminho absoluto, use apenas esse parâmetro.
 *             Por exemplo:
 *
 *   ```
 *   getDataFromDatabase("users/" + uid).then(...);
 *   ```
 *
 *   Não é recomendado usar com caminho absoluto, uma vez que, se alguma
 *   parte do caminho ser alterada (como o nome da pasta dos usuários, por
 *   exemplo), **todas** as chamadas que usem o caminho absoluto precisarão
 *   de alteração.
 *
 *
 * @param chName Nome da criança/atributo (por padrão, é nula). Por exemplo, se você quisesse
 * acessar um usuário a partir da referência do `users`, você poderia usar:
 *
 *   ```
 *   getDataFromDatabase(UsersDatabaseRef, uid).then(...);
 *   ```
 *
 *   Outro exemplo seria acessar um atributo específico do usuário, como o email,
 *   a partir da referência do usuário (lembre-se de colocar o '/' no início):
 *
 *   ```
 *   getDataFromDatabase(refFromUser(uid), "/email").then(...);
 *   ```
 *   Caso tenha o caminho absoluto, não use esse parâmetro.
 * @return {Promise<DataSnapshot>} Promise com a Snapshot da informação.
 */
export function getDataFromDatabase(path, chName=null) {
    let refPath = path;
    // Se o caminho for uma string, converte para referência do banco de dados
    if (typeof path === 'string') refPath = refFromDatabase(path)
    // Se o parâmetro chName estiver vazio, é caminho absoluto.
    if (chName === null) return get(refPath);
    // Se o parâmetro chname não estiver vazio, o caminho é relativo
    // no formato `path/chName` (ou seja, obter o elemento cujo nome é
    // `chName` dentro de `path`)
    else return get(child(refPath, chName));
}

/**
 * Retorna a referência da célula do banco de dados do usuário com o uid dado.
 * A referência tem o caminho da forma `users/uid`.
 * @param uid UID do usuário.
 * @return DatabaseReference Referência do usuário com o uid dado.
 */
export function refFromUser(uid) {
    return child(UsersDatabaseRef, uid);
}

/**
 * Retorna uma promise com a informação guardada no caminho do usuário com o uid dado.
 * Ou seja, retorna as informações do usuário.
 * @param uid UID do usuário.
 * @return {Promise<DataSnapshot>} Promise com a Snapshot da informação do usuário.
 */
export function getDataFromUser(uid) {
    return get(refFromUser(uid));
}

/**
 * Retorna uma promise com a informação do atributo específico do usuário com o uid dado.
 * @param uid UID do usuário.
 * @param attribute Atributo específico do usuário que se deseja acessar. Por exemplo, `email` ou `pontos`.
 * @return {Promise<DataSnapshot>} Promise com a informação do atributo específico do usuário. Se o atributo não existir, retorna undefined.
 */
export function getAttributeFromUser(uid, attribute) {
    return get(refFromUser(uid)).then(snapshot => {
        if (snapshot.exists()) {
            return snapshot.val()[attribute];
        }
        // Se chegou até aqui, a snapshot não existe
        return undefined;
    });
}

//mostrar conteúdo para usuários autenticados
export function showUserContent(user) {
    if (!user) return;

    // Exibe dados básicos do Auth
    if (userImg) userImg.src = user.photoURL ? user.photoURL : 'images/unknownUser.png';
    if (userName) userName.innerHTML = user.displayName || '';
    let firstName = String(user.displayName).split(" ", 1)[0];
    if (welcome_message) welcome_message.innerHTML = "Bem-vindo(a), " + firstName + "!";
    if (userEmail) userEmail.innerHTML = user.email || '';
    if (userRoleEl) userRoleEl.innerText = getUserRole();

    // Busca dados adicionais no BD
    getDataFromUser(user.uid).then(snapshot => {
        const data = snapshot.val() || {};

        if (userId) userId.innerHTML = data.userId ? "CPF: " + data.userId : 'CPF: N/A';
        if (userClass) userClass.innerHTML = data.userClass ? "Turma: " + data.userClass : 'Turma: N/A';
        if (userCourse) userCourse.innerHTML = data.userCourse ? "Curso: " + data.userCourse : 'Curso: N/A';

        if ((userId && userId.innerHTML === 'CPF: N/A') ||
            (userClass && userClass.innerHTML === 'Turma: N/A') ||
            (userCourse && userCourse.innerHTML === 'Curso: N/A')) {
            abrirAlerta('⚠️ Algumas informações do usuário estão faltando.\n' +
                'Sem elas não será possível realizar inscrições.\n' +
                'Por favor, edite suas informações pessoais.').then();
        }

        hideItem(authElement);
        showItem(homePage);
    }).catch(error => {
        console.error("Erro ao buscar dados adicionais do usuário:", error);
        enviarErroParaSentry(error);
        hideItem(authElement);
        showItem(homePage);
    });
}


//editar informações pessoais do usuário
export function editPersonalInfo() {
    const user = Auth.currentUser;
    if (!user) return;

    getDataFromUser(user.uid).then(snapshot => {
        const data = snapshot.val() || {};

        // Preencher formulário com valores atuais
        const cpfEl = document.getElementById('cpf');
        const turmaEl = document.getElementById('turma');
        const cursoEl = document.getElementById('curso');

        // Salva os valores iniciais para possibilitar restauração caso o usuário cancele
        editPersonalInfoInitial.cpf = data.userId || "";
        editPersonalInfoInitial.turma = data.userClass || "";
        editPersonalInfoInitial.curso = data.userCourse || "";

        if (cpfEl) cpfEl.value = editPersonalInfoInitial.cpf;
        if (turmaEl) turmaEl.value = editPersonalInfoInitial.turma;
        if (cursoEl) cursoEl.value = editPersonalInfoInitial.curso;
    });

    editPersonalInfoModal.style.display = "flex";
}

//cancelar edição de informações pessoais
export function cancelEdit() {
    // Esconde o modal e restaura os valores iniciais.
    hideItem(editPersonalInfoModal);

    // Se ainda for um <form> com reset(), usa o reset nativo.
    if (editPersonalInfoForm && typeof editPersonalInfoForm.reset === 'function') {
        try {
            editPersonalInfoForm.reset();
            return;
        } catch (e) {
            // segue para a restauração manual
            console.warn('form.reset() falhou, restaurando campos manualmente', e);
        }
    }

    // Caso o editor tenha sido transformado em <div> (sem reset), restaura campos individuais
    const cpfEl = document.getElementById('cpf');
    const turmaEl = document.getElementById('turma');
    const cursoEl = document.getElementById('curso');

    if (cpfEl) cpfEl.value = editPersonalInfoInitial.cpf || "";
    if (turmaEl) turmaEl.value = editPersonalInfoInitial.turma || "";
    if (cursoEl) cursoEl.value = editPersonalInfoInitial.curso || "";
}



//verificação de cpf
export function validarCPF(cpf) {
    if (!cpf) return false;

    // Remove caracteres não numéricos
    cpf = cpf.replace(/[^\d]+/g, '');

    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) return false;

    // Elimina CPFs inválidos conhecidos (ex: todos dígitos iguais)
    if (/^(\d)\1+$/.test(cpf)) return false;

    // ----- Cálculo do 1º dígito verificador -----
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = soma % 11;
    let digitoJ = (resto < 2) ? 0 : 11 - resto;

    if (digitoJ !== parseInt(cpf.charAt(9))) return false;

    // ----- Cálculo do 2º dígito verificador -----
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = soma % 11;
    let digitoK = (resto < 2) ? 0 : 11 - resto;

    return digitoK === parseInt(cpf.charAt(10));
}

//centralizar e traduzir erros
export function showError(prefix, error) {
    hideItem(loading);
    console.error(error.code);

    if (error.code) {
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                //abrirAlerta(prefix + ' ' + 'Pop-up fechado pelo usuário antes da operação ser concluída!');
                break;
            case 'auth/user-cancelled':
                //abrirAlerta('Você cancelou sua autenticação!');
                break;
            default:
                abrirAlerta(prefix + ' ' + error.message);
                enviarErroParaSentry(error);
        }
    } else {
        abrirAlerta('Erro desconhecido: ' + error);
        enviarErroParaSentry(error);
    }
}

//let actionCodeSettings = {
//    url: 'coltrekking-app-c3026.firebaseapp.com'
//}


