// Converte data BR para formato yyyy-mm-dd (para input type="date")
function formattedDate(date) {
    const dateObj = new Date(date);
    if (isNaN(dateObj)) return 'Data inválida';
    return dateObj.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour12: false
    });
}

// Função auxiliar para validar ordem das datas
function validarOrdemDatas(dataInscricao, dataPrelecao, dataEvento) {
    const inscricao = new Date(dataInscricao).getTime();
    const prelecao = new Date(dataPrelecao).getTime();
    const evento = new Date(dataEvento).getTime();

    if (isNaN(inscricao) || isNaN(prelecao) || isNaN(evento)) {
        alert("⚠️ Datas inválidas. Verifique os campos.");
        return false;
    }

    if (!(inscricao < prelecao && prelecao < evento)) {
        alert("⚠️ Ordem das datas inválida:\nInscrição -> Preleção -> Evento");
        return false;
    }

    return true;
}