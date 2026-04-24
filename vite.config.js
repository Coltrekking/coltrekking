/**
 * Arquivo de configuração do vite
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({

    // Diz ao Vite que os HTMLs estão na pasta 'pages'
    root: 'pages',

    // Garante que o Vite busque o .env na raiz do projeto
    envDir: '..',

    // Diretório que o vite apenas copiará
    publicDir: '../public',

    resolve: {
        alias: {
            // Cria um apelido para a pasta src
            '/src': resolve(__dirname, './src'),
        },
    },

    server: {
        fs: {
            // Permite que o Vite busque arquivos fora da pasta 'pages'
            allow: ['..']
        }
    },


    build: {
        // Diz onde deve colocar os arquivos compilados
        outDir: '../dist',
        // Limpa a pasta antes de colocar os novos arquivos
        emptyOutDir: true,

        rollupOptions: {
            input: {
                main: resolve(__dirname, './pages/index.html'),
                home: resolve(__dirname, './pages/homePage.html'),
                admin: resolve(__dirname, './pages/homeAdmin.html'),
                404: resolve(__dirname, './pages/404.html'),

                // Adicione novas páginas no seguinte formato:
                // nome: resolve(__dirname, 'arquivo.html')
            },
        },
    },
});