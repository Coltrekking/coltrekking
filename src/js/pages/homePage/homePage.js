/**
 * Código do homePage.html
 * Apenas usuários normais acessam esse site.
 */
import './homeMutual'
import {isAdmin} from "../../auth";
import "../../event"
import {loadCommonEvents} from "./homeMutual";

/**
 * Carrega os eventos
 */
function loadEvents() {

}

/**
 * Carrega a página
 */
function loadPage() {
    // Carrega os eventos da página
    loadCommonEvents();
    loadEvents();
}

if (!isAdmin() && (window.location.pathname === "/homePage.html" || window.location.pathname === "/homePage" )) loadPage()









