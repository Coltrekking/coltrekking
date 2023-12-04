import * as ntp		from 'ntp-time'

const client_ntp		    = new ntp.Client('time-e-b.nist.gov', 123, { timeout: 3000 });
const fusoHorarioServidor   = -3	//HORARIO DE BRASILIA

export { client_ntp, fusoHorarioServidor }
