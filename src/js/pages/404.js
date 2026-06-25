/**
 * Código que é executado quando a página 404 é aberta.
 * @author André Dias
 * @since 2026-06
 */

import {Auth, PAGE_VERSION} from "/src/config/firebase";
import {signOut} from "firebase/auth";

// Carrega o texto de versão
const _pageVersionOn404 = document.getElementById("pageVersionOn404");
if (_pageVersionOn404) _pageVersionOn404.innerHTML = `Versão da página: ${PAGE_VERSION}`;

// Obtém de onde o usuário veio
const sourceUrl = document.referrer;
if (sourceUrl) {
    // Se tiver vindo da página de login, desloga
    if (sourceUrl.includes("index") || sourceUrl.endsWith("/")) {
        signOut(Auth).then(function() {
            localStorage.removeItem("isLogged");
        }).catch(function(error) {
            console.log("Erro ao sair: ", error);
        });
    }
}

