/**
 * Código que guarda as configurações do firebase e algumas da página.
 */

// Versão da página //
export const PAGE_VERSION = "aXX08";


import { initializeApp } from "firebase/app"; // Para inicializar o app

import { getAuth } from 'firebase/auth'; // Para obter o auth
import { getDatabase } from 'firebase/database'; // Para obter o Realtime Database

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

export default App;


