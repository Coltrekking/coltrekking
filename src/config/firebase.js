/*
-- Para modernizar --

import { initializeApp } from "firebase/app"; // Para inicializar o app

import { getAuth } from 'firebase/auth'; // Para obter o auth
import { getDatabase } from 'firebase/database'; // Para obter o Realtime Database
*/
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

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

// Inicializa o Firebase apenas se ainda não foi inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Inicializa o Firebase e exporta as bibliotecas
//export const Auth = getAuth(App);
//export const Database = getDatabase(App);

export const Auth = firebase.auth();
export const Database = firebase.database();

export default firebase;

