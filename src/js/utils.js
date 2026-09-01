import {APPS_SCRIPT_CHAVE_SECRETA, APPS_SCRIPT_URL, Auth, Database} from "../config/firebase";
import {child, get, onValue, ref} from "firebase/database";
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
export let eventFormModal = document.getElementById('eventFormModal');
export let submitEventForm = document.getElementById('submitEventForm');
export let editEventForm = document.getElementById('editEventForm');
//export let eventContainer = document.getElementById('eventContainer');
//export let eventCount = document.getElementById('eventCount');

export const EventsDatabaseRef = refFromDatabase("event/");
export const InscricoesDatabaseRef = refFromDatabase("inscricoes/");
export const PhotosDatabaseRef = refFromDatabase("photos/");
export const UsersDatabaseRef = refFromDatabase("users/");
export const GeralDatabaseRef = refFromDatabase("geral/");
export const ArquivosDatabaseRef = refFromDatabase("arquivos/");
// NOTA: não vale a pena colocar o ArquivosDatabase dentro de geral, pois a tendência
// é que "geral" tenha poucas informações, enquanto o ArquivosDatabase tenha muitas.


// Função estática para gerar um delay
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
        else if (item === eventFormModal) item.style.display = 'flex';
        else item.style.display = 'block';
    }
}

/**
 * Mostra o elemento usando display flex.
 * @param item elemento que será aplicado o display flex.
 */
export function showItemAsFlex(item) {
    if (item && item.style) {
        item.style.display = 'flex';
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

// Traduz e mostra erros
export function showError(prefix, error) {
    hideItem(loading);
    console.error(error.code);

    if (error.code) {
        switch (error.code) {
            case 'auth/popup-closed-by-user':
            case 'auth/cancelled-popup-request':
                //abrirAlerta(prefix + ' ' + 'Pop-up fechado pelo usuário a antes da operação ser concluída!');
                break;
            case 'auth/user-cancelled':
                //abrirAlerta('Você cancelou sua autenticação!');
                break;
            default:
                abrirAlerta(prefix + ' ' + error.message).then( );
                enviarErroParaSentry(error);
        }
    } else {
        abrirAlerta('Erro desconhecido: ' + error).then( );
        enviarErroParaSentry(error);
    }
}

// Variável para guardar a diferença de tempo
let serverTimeOffset = 0;

// Ouve a diferença de tempo calculada pelo Firebase
const offsetRef = ref(Database, ".info/serverTimeOffset");
onValue(offsetRef, (snap) => {
    serverTimeOffset = snap.val() || 0;
});

/**
 * Obtém o horário aproximado do servidor, sem o horário do dispositivo afetar.
 * O horário obtido pode conter um erro de até um segundo (como o próprio
 * site diz).
 * @return {Number} horário real, em milissegundos.
 */
export function getRealTime() {
    // Relógio do usuário + a diferença exata para o servidor
    return Date.now() + serverTimeOffset;
}

/**
 * Comprime e redimensiona uma imagem antes de transformá-la em blob WebP.
 * @param {File|Blob} file o arquivo de imagem original.
 * @param {number} maxWidth largura máxima (padrão: 1200px).
 * @param {number} maxHeight altura máxima (padrão: 1200px).
 * @param {number} quality qualidade da imagem de 0 a 1 (padrão: 0.75 = 75%).
 * @returns {Promise<Blob>} o blob da imagem comprimida em formato WebP.
 */
export function compressImageToBlob(file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

        img.onload = () => {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            // Mantém a proporção real da imagem (Aspect Ratio)
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            URL.revokeObjectURL(objectUrl);

            // Converte o canvas direto para um Blob em WebP
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Falha ao comprimir a imagem."));
                }
            }, 'image/webp', quality);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Erro ao processar a imagem: " + (err?.message || "formato não suportado")));
        };
    });
}

/**
 * Converte uma imagem para um .webp
 * @param {File} file imagem que se deseja converter
 * @param {number} quality qualidade da foto (a padrão é 0.8)
 * @returns {Promise<File>} arquivo convertido
 */
export function convertToWebp(file, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

        img.onload = () => {
            // Cria um canvas para colocar a imagem
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0); // Coloca a imagem no canvas

            // Transforma o canvas em um .webp
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(objectUrl);

                if (!blob) {
                    reject(new Error('Erro na conversão da imagem!'));
                    return;
                }

                // Cria o novo arquivo .webp
                const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                const webpFile = new File([blob], newFileName, { type: 'image/webp' });

                resolve(webpFile);
            }, 'image/webp', quality);
        };

        img.onerror = (error) => {
            URL.revokeObjectURL(objectUrl);
            reject(error);
        };
    });
}

/**
 * Verifica se o tamanho do arquivo é menor ou igual ao tamanho máximo permitido.
 * @param {File} file arquivo que deseja se verificar o tamanho.
 * @param {number} maxSizeInMB tamanho máximo permitido (em megabytes).
 * @returns {boolean} se o arquivo está dentro do tamanho máximo.
 */
export function checkFileSize(file, maxSizeInMB) {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024; // Transforma em bytes
    return file.size <= maxSizeInBytes;
}

/**
 * Verifica se o tamanho da foto é menor ou igual ao tamanho máximo
 * permitido, que é de 32MB.
 * @param {File} file foto que deseja se verificar o tamanho.
 * @returns {boolean} se a foto está dentro do tamanho máximo.
 */
export function checkPhotoSize(file) {
    return checkFileSize(file, 32);
}

/**
 * Transforma o arquivo dado em uma String Base64.
 * @param {File} file arquivo que se deseja transformar na string.
 * @returns {Promise<String>} Promise com a string Base64 do arquivo.
 */
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // O resultado vem como "data:(o_tipo_do_arquivo);base64,JVBERi0xLjQK..."
            // No entanto, precisamos apenas da parte depois da vírgula
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}

/**
 * Envia a informação dada ao API no Apps Script.
 * @param {Object} data informação que será enviada ao apps script.
 * @return {Promise<any>} Promise com a resposta do Apps Script.
 */
async function sendRequestToAppsScript(data) {

    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        // Send as plain text to avoid CORS preflight (OPTIONS) pre-checks
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(data)
    });

    if (!response.ok)
        throw new Error('Erro na conexão com o Apps Script');

    // Retorna a resposta
    return await response.json();
}

// Classe responsável pela representação de um arquivo que será enviado para o banco de dados.
export class FileData {
    constructor(nome,  arquivo) {
        this.nome = nome;
        this.arquivo = arquivo;
    }
}

/**
 * Função que salva os arquivos dados no banco de dados, colocando
 * os arquivos na referência dada.
 * @param {DatabaseReference} ref referência do banco de dados onde os arquivos serão salvos.
 *                                Note que é *a referência*, não uma string com a posição!
 * @param {Array<FileData>} arquivos lista dos arquivos que serão salvos, com o respectivo identificador.
 *                                   Lembre-se de obedecer a estrutura da classe FileData!
 */
export function saveFilesInDatabaseAsLinks(ref, arquivos) {
    // Verifica o tamanho de cada arquivo antes de enviar.
    // O tamanho máximo recomendado é de 10MB, uma vez que ainda
    // será preciso convertê-lo em texto.
    const maxFileSizeInMB = 10;
    arquivos.forEach(fileData => {
        if (!fileData.arquivo) {
            // Se tiver o nome do arquivo, manda uma mensagem de erro com o nome do arquivo.
            // Caso contrário, manda uma mensagem genérica.
            if (fileData.nome)
                throw new Error("O arquivo " + fileData.nome + " não foi encontrado.");
            else
                throw new Error("Um arquivo não identificado não foi encontrado. NOTA: Esse arquivo não teve seu campo `nome` preenchido, então não é possível identificar qual arquivo é.");
        }

        if (!checkFileSize(fileData.arquivo, maxFileSizeInMB))
            throw new Error("O arquivo excede o tamanho máximo permitido de " + maxFileSizeInMB + "MB. Se você acha que isso é um problema, contate um administrador.");
    });

    // Faz várias promises enviando cada arquivo (para maximizar a eficiência)
    const promises = arquivos.map(async (fileData) => {

        const base64String = await fileToBase64(fileData.arquivo);

        // Monta o que vai enviar ao Apps Script
        const payload = {
            fileName: fileData.nome || "arquivo_sem_nome", // Pega o nome do arquivo
            mimeType: fileData.arquivo.type || "application/octet-stream", // Pega o tipo (ex: image/png, application/pdf)
            fileContent: base64String, // Conteúdo do arquivo em Base64
            tokenDeSeguranca: APPS_SCRIPT_CHAVE_SECRETA // Chave para poder enviar para o Apps Script (para evitar que qualquer um envie arquivos)
        };

        // Envia o payload para o Apps Script.
        // Retorna um objeto com os campos: {status, fileUrl, fileId}
        const resposta = await sendRequestToAppsScript(payload);

        // Lança um erro se houve algum
        if (resposta.status === 'error') {
            throw new Error("Erro ao salvar no Drive: " + resposta.message);
        }

        const link = resposta.fileUrl;
        const id = resposta.fileId; // o id é importante para apagar o arquivo depois, caso seja necessário.
        console.log("Arquivo enviado! Link:" + link + " com id: " + id);

        // Se não obteve o link, lança um erro
        if (!link) {
            throw new Error("Erro ao enviar o arquivo: o link retornado é inválido.");
        }

        return {link, id};
    });

    // Retorna todas as promessas
    return Promise.all(promises);
}