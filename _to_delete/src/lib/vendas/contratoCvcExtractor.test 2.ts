import { describe, expect, it } from 'vitest';
import { extractContratosFromText } from './contratoCvcExtractor';

describe('contratoCvcExtractor', () => {
  it('extrai o nome limpo do hotel em serviços inclusos CVC', async () => {
    const result = await extractContratosFromText(`
Contrato de Intermediação de Serviços de Turismo

1. DAS PARTES
CLIENTE:   LENI N V CAMPANELLI , RG nº  151.457.658-94 , CPF nº  151.457.658-94.

3. DOS SERVICOS PRESTADOS

Nº Contrato: 5630-0000084440 Reserva: 304779614
Excursão: 9.06087465.26062101
Destino: - ROMA  -  3 dia(s) /  2 noite(s)
Data Saída: 21/06/2026
Data Retorno: 23/06/2026

SERVIÇOS INCLUSOS
2 DIÁRIAS NO LEONARDO BOUTIQUE HOTEL ROME MONTI - DIARIAS EM APARTAMENTO (Sem Café Da Manhã) (Sem Café da Manhã)
TIPO ACOMODAÇÃO: 1 APARTAMENTO COZY ROOM - HOTELBEDS - NR: 207-16121213 - [207-16121213]

NOME DO PASSAGEIRO
CAROLINA CAMPANELLI 53143491833 30/11/2001

4. DO PRECO
5. VALOR E FORMA DE PAGAMENTO
Os serviços contratados totalizam o valor de R$  3.114,03
`);

    expect(result.contratos).toHaveLength(1);
    expect(result.contratos[0].produto_principal).toBe(
      'LEONARDO BOUTIQUE HOTEL ROME MONTI',
    );
    expect(result.contratos[0].produto_tipo).toBe('Hotel');
  });
});
