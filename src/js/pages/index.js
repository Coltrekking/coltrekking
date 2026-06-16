/**
 * Código do index.html
 */

import {isAdmin, signInWithGoogle, waitForUser} from '../auth.js';
import {Auth} from "/src/config/firebase";
import {onAuthStateChanged} from "firebase/auth";
import {ADMIN_HOME_PAGE_ADDRESS, USER_HOME_PAGE_ADDRESS} from "/src/js/pages/pages";

// Verifica se o usuário está logado. Se tiver, aparece a tela de carregando
if (localStorage.getItem("isLogged") === "true") {
    // Deixa a tela escura para indicar que está redirecionando (para
    // não deixar o usuário clicar em nada)
    document.getElementById("darkOverlay").style.display = "flex";
}

// Se o usuário já estiver logado, redireciona ele para a homePage
onAuthStateChanged(Auth, async (user) => {
    // Verifica se o usuário já está logado
    if (user) {
        // Espera pelo usuário
        await waitForUser()
        // Redireciona para a devida página
        if (isAdmin())
            window.location.href = ADMIN_HOME_PAGE_ADDRESS;
        else
            window.location.href = USER_HOME_PAGE_ADDRESS;
    } else { // Se não estiver carregado, desaparece o carregamento
        document.getElementById("darkOverlay").style.display = "none";
    }
})
document.getElementById("btnLogarGoogle").addEventListener("click", signInWithGoogle);

