/**
 *  Código responsável por inicializar tudo que precisa ser
 *  inicializado logo no início do site. Basicamente, vai
 *  importar tudo que deve ser inicializado assim que o usuário
 *  entra no site.
 *  NOTE: esse é o primeiro código a ser iniciado no site.
 */

// Inicializa o Sentry
// É importante que ele seja o primeiro a inicializar para
// capturar erros que possam acontecer a qualquer momento.
import * as Sentry from "@sentry/browser";

// Só inicializa o Sentry se já não estiver inicializado e se não estiver no localhost
if ( !Sentry.isInitialized() && !window.location.href.includes("localhost")) {
    Sentry.init({
        dsn: "https://905b41850b469eedf58c6cb003519961@o4511315340754944.ingest.us.sentry.io/4511315348422656",
        integrations: [
            Sentry.replayIntegration(),
        ],

        // Session Replay (gravação de replay) //

        // replaysSessionSampleRate: quantos % dos usuários terão seus replays gravados (mesmo se não
        //                           houver nenhum problema)
        // NOTE: se, em algum momento, precisar de ver o comportamento do usuário, pode trocar esse valor.
        //       No geral, isso não é necessário para o projeto.
        replaysSessionSampleRate: 0.0,

        // replaysOnErrorSampleRate: quantos % dos usuários terão seus replays gravados quando um erro acontecer
        // NOTE: recomendo 100% para, sempre que houver erro, ter o replay
        replaysOnErrorSampleRate: 1.0,
    });
}
/**
 * Identifica o aluno para o Sentry. Dessa forma, os erros gerados estarão
 * ligados a esse usuário.
 * @param userUid UID do usuário (do Firebase)
 * @param email Email do usuário
 * @param data Data do usuário (do banco de dados)
 */
export function identificarUserParaSentry(userUid, email, data) {
    Sentry.setUser({
        email: email, // não tem o email por padrão nas informações do usuário. Por isso, coloquei aqui manualmente
        uid: userUid,
        data: data
    });
}

/**
 * Envia o erro dado para o Sentry
 * @param error erro a ser enviado
 */

// Código de Erros que não serão enviados para o sentry
const errosIgnorados = [
    "auth/popup-closed-by-user",
    "auth/cancelled-popup-request",
    "auth/network-request-failed"
]
export function enviarErroParaSentry(error) {
    // Não envia erros se estiver no localhost
    if (window.location.href.includes("localhost")) return;

    let containAnyIgnoredError = false;

    // Verifica se o erro deve ser ignorado
    if (error && error.code) {
        for (const erroIgnorado of errosIgnorados) {
            if (error.code.includes(erroIgnorado)) {
                containAnyIgnoredError = true;
                break;
            }
        }
    }

    // Se o erro não deve ser ignorado, envia para o Sentry
    if (!containAnyIgnoredError) Sentry.captureException(error);
}

/* ========================= */

// Inicializa o resto do site
import '../config/firebase';    // Inicializa o Firebase. Certifique-se de que esse é o primeiro para evitar erros!
import "./auth"
import './utils';
import './tabs'
import './date'
import "./pages/common/barraAviso";
import {PAGE_VERSION} from "/src/config/firebase";


// Carrega os elementos de versão da página //
const _pageVersionElement = document.getElementById("pageVersionText");
if (_pageVersionElement) _pageVersionElement.innerText = `Versão da página: ${PAGE_VERSION}`;

const _pageVersionOnIndex = document.getElementById("pageVersionOnIndex");
if (_pageVersionOnIndex) _pageVersionOnIndex.innerText = `Versão: ${PAGE_VERSION}`;