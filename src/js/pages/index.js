/**
 * Código do index.html
 */

import {isAdmin, signInWithGoogle, waitForUser} from '../auth.js';
import {Auth} from "/src/config/firebase";
import {onAuthStateChanged} from "firebase/auth";

// Se o usuário já estiver logado, redireciona ele para a homePage
onAuthStateChanged(Auth, async (user) => {
    // Verifica se o usuário já está logado
    if (user) {
        // Deixa a tela escura para indicar que está redirecionando (para
        // não deixar o usuário clicar em nada)
        document.getElementById("loginModal").style.display = "flex";
        // Espera pelo usuário
        await waitForUser()
        // Redireciona para a devida página
        if (isAdmin())
            window.location.href = "/homeAdmin.html";
        else
            window.location.href = "/homePage.html";
    }
})
document.getElementById("btnLogarGoogle").addEventListener("click", signInWithGoogle);

