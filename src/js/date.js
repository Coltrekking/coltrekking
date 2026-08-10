// Converte data BR para formato yyyy-mm-dd (para input type="date")
import {abrirAlerta} from "/src/js/modal";
import {hideLoading} from "/src/js/utils";

export function formattedDate(date) {
    const dateObj = new Date(date);
    if (isNaN(dateObj)) return 'Data inválida';
    return dateObj.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour12: false
    });
}

// Função auxiliar para validar ordem das datas
export function validarOrdemDatas(dataInscricao, dataPrelecao, dataEvento) {
    const inscricao = new Date(dataInscricao).getTime();
    const prelecao = new Date(dataPrelecao).getTime();
    const evento = new Date(dataEvento).getTime();

    if (isNaN(inscricao) || isNaN(prelecao) || isNaN(evento)) {
        abrirAlerta("⚠️ Datas inválidas. Verifique os campos.").then( );
        return false;
    }

    if (!(inscricao < prelecao && prelecao < evento)) {
        abrirAlerta("⚠️ Ordem das datas inválida:\nInscrição -> Preleção -> Evento").then( );
        return false;
    }

    return true;
}