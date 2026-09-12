/**
 * Código que guarda as configurações do firebase e algumas da página.
 */

// Versão da página //
export const PAGE_VERSION = "a1509";

// Determina se usará emuladores do Firebase em testes locais //
const USE_EMULATOR_ON_LOCALHOST = true;


import { initializeApp } from "firebase/app"; // Para inicializar o app

import { getAuth } from 'firebase/auth'; // Para obter o auth
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'; // Para obter o Realtime Database

// Dados do firebase
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Link do código do Apps Script
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyBSEEIxswCLy9nF0bAHrsUNXaDbEV-jOM3JsqoG6a2dfZwn3rbfaRROQ_hVPJYSx6h/exec";
// Chave secreta para poder usar o Apps Script
export const APPS_SCRIPT_CHAVE_SECRETA = import.meta.env.VITE_APPS_SCRIPT_CHAVE_SECRETA;

// Inicializa o Firebase
//if (!firebase.apps.length) {
export const App = initializeApp( firebaseConfig );
//}

// Inicializa o Firebase e exporta as bibliotecas
export const Auth = getAuth(App);
export const Database = getDatabase(App);

/* Configurar o emulador */
if (USE_EMULATOR_ON_LOCALHOST && window.location.hostname === "localhost") {
    // Para não precisar cadastrar novamente as contas do Google
    //connectAuthEmulator(Auth, "http://127.0.0.1:9099");

    // Para o Realtime Database, passamos o host e a porta separadamente
    connectDatabaseEmulator(Database, "127.0.0.1", 9000);

    console.log("===================================================");
    console.log("**Conectado aos Emuladores Locais!**");
    console.log("QUALQUER MUDANÇA NÃO AFETARÁ O BANCO DE DADOS REAL.");
    console.log("===================================================");
}

export default App;


