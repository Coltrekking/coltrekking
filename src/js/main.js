/**
 *  Código responsável por inicializar tudo que precisa ser
 *  inicializado logo no início do site. Basicamente, vai
 *  importar tudo que deve ser inicializado assim que o usuário
 *  entra no site.
 */

import '../config/firebase';    // Inicializa o Firebase. Certifique-se de que esse é o primeiro para evitar erros!
import "./auth"
import './utils';
import './tabs'
import './date'
