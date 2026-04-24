/**
 * Código do index.html
 */

import {signInWithGoogle} from '../auth.js';

document.getElementById("logoGoogle").addEventListener("click", signInWithGoogle);