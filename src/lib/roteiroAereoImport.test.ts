import { describe, it, expect } from 'vitest';
import { parseImportedRoteiroAereo } from './roteiroAereoImport';

const EXAMPLE_CVC_TEXT = `Detalhes do produto
Detalhes do produto
Regras de cancelamento

Latam
Fácil
Não reembolsável
Ida

Voo com paradas

Qui, 18 de Junho

CGH 13:25
Congonhas, São Paulo
1h 45min
Voo direto
JJ 3008
15:10 BSB
Presidente Juscelino Kubitschek, Brasília
Espera de 01h 40min
BSB 16:50
Presidente Juscelino Kubitschek, Brasília
2h 25min
Voo direto
JJ 3760
19:15 MCZ
Zumbi dos Palmares, Maceió
Bagagens Inclusas

Bolsa ou mochila pequena

1 bolsa ou mochila pequena. Deve caber embaixo do assento. Em todo voo você tem direito de levar uma bolsa pequena com seus pertences

Bagagem de mão

1 mala de até 12kg. Deve caber no bagageiro de cabine

Latam
Fácil
Não reembolsável
Volta

Voo com paradas

Qui, 25 de Junho

MCZ 13:25
Zumbi dos Palmares, Maceió
2h 30min
Voo direto
JJ 3761
15:55 BSB
Presidente Juscelino Kubitschek, Brasília
Espera de 02h 10min
BSB 18:05
Presidente Juscelino Kubitschek, Brasília
1h 40min
Voo direto
JJ 4737
19:45 CGH
Congonhas, São Paulo
Bagagens Inclusas

Bolsa ou mochila pequena

1 bolsa ou mochila pequena. Deve caber embaixo do assento. Em todo voo você tem direito de levar uma bolsa pequena com seus pertences

Bagagem de mão

1 mala de até 12kg. Deve caber no bagageiro de cabine`;

describe('parseImportedRoteiroAereo - formato CVC Detalhes do produto', () => {
  it('extrai ida e volta com escalas do exemplo CVC', () => {
    const result = parseImportedRoteiroAereo(EXAMPLE_CVC_TEXT, new Date(2026, 0, 1));
    expect(result).toHaveLength(4);

    // Ida - segmento 1: CGH -> BSB
    expect(result[0].cia_aerea).toBe('Latam');
    expect(result[0].data_voo).toBe('2026-06-18');
    expect(result[0].hora_saida).toBe('13:25');
    expect(result[0].aeroporto_saida).toBe('CGH');
    expect(result[0].hora_chegada).toBe('15:10');
    expect(result[0].aeroporto_chegada).toBe('BSB');
    expect(result[0].duracao_voo).toBe('1h 45min');
    expect(result[0].tipo_voo).toBe('1 escala');
    expect(result[0].trecho).toBe('São Paulo - Maceió');
    expect(result[0].tarifa_nome).toBe('Fácil');
    expect(result[0].reembolso_tipo).toBe('Não reembolsável');

    // Ida - segmento 2: BSB -> MCZ
    expect(result[1].cia_aerea).toBe('Latam');
    expect(result[1].data_voo).toBe('2026-06-18');
    expect(result[1].hora_saida).toBe('16:50');
    expect(result[1].aeroporto_saida).toBe('BSB');
    expect(result[1].hora_chegada).toBe('19:15');
    expect(result[1].aeroporto_chegada).toBe('MCZ');
    expect(result[1].duracao_voo).toBe('2h 25min');
    expect(result[1].tipo_voo).toBe('1 escala');
    expect(result[1].trecho).toBe('São Paulo - Maceió');

    // Volta - segmento 1: MCZ -> BSB
    expect(result[2].cia_aerea).toBe('Latam');
    expect(result[2].data_voo).toBe('2026-06-25');
    expect(result[2].hora_saida).toBe('13:25');
    expect(result[2].aeroporto_saida).toBe('MCZ');
    expect(result[2].hora_chegada).toBe('15:55');
    expect(result[2].aeroporto_chegada).toBe('BSB');
    expect(result[2].duracao_voo).toBe('2h 30min');
    expect(result[2].tipo_voo).toBe('1 escala');
    expect(result[2].trecho).toBe('Maceió - São Paulo');

    // Volta - segmento 2: BSB -> CGH
    expect(result[3].cia_aerea).toBe('Latam');
    expect(result[3].data_voo).toBe('2026-06-25');
    expect(result[3].hora_saida).toBe('18:05');
    expect(result[3].aeroporto_saida).toBe('BSB');
    expect(result[3].hora_chegada).toBe('19:45');
    expect(result[3].aeroporto_chegada).toBe('CGH');
    expect(result[3].duracao_voo).toBe('1h 40min');
    expect(result[3].tipo_voo).toBe('1 escala');
    expect(result[3].trecho).toBe('Maceió - São Paulo');
  });

  it('extrai voo direto sem escalas', () => {
    const text = `Detalhes do produto
Regras de cancelamento

Gol
Light
Reembolsável
Ida

Voo direto

Seg, 10 de Agosto

CGH 08:00
Congonhas, São Paulo
2h 30min
Voo direto
G3 1234
10:30 SSA
Deputado Luís Eduardo Magalhães, Salvador
Bagagens Inclusas`;

    const result = parseImportedRoteiroAereo(text, new Date(2026, 0, 1));
    expect(result).toHaveLength(1);
    expect(result[0].cia_aerea).toBe('Gol');
    expect(result[0].data_voo).toBe('2026-08-10');
    expect(result[0].hora_saida).toBe('08:00');
    expect(result[0].aeroporto_saida).toBe('CGH');
    expect(result[0].hora_chegada).toBe('10:30');
    expect(result[0].aeroporto_chegada).toBe('SSA');
    expect(result[0].duracao_voo).toBe('2h 30min');
    expect(result[0].tipo_voo).toBe('Voo direto');
    expect(result[0].trecho).toBe('São Paulo - Salvador');
    expect(result[0].tarifa_nome).toBe('Light');
    expect(result[0].reembolso_tipo).toBe('Reembolsável');
  });

  it('retorna vazio para texto sem formato CVC reconhecido', () => {
    const result = parseImportedRoteiroAereo('apenas texto sem dados de voo', new Date());
    expect(result).toHaveLength(0);
  });
});

const EXAMPLE_REXTUR_CONNECTION = `Sua Escolha
Fechar
Cia\tVoo\tSaída\tChegada\tOrigem\tDestino(s)\tEsc\tEquip.\tTipo\tClasse\t \tFamília\tBagagem\tTotal\t 
GOL(G3)
GOL(G3)
	
G3 1378
	
G3 9180
11/06/2026 - 18:55
12/06/2026 - 00:25
11/06/2026 - 20:05
12/06/2026 - 03:10
São Paulo - guarulhos
Rio de Janeiro - galeão
Rio de Janeiro - galeão
Maceió - zumbi dos palmares
0
0
7M8
738
OW
OW
J
 	 	 
J
 	 	 
 	LIGHT	
	
R$ 2722,74

R$ 2722,74

Reservar`;

const EXAMPLE_REXTUR_DIRECT = `Sua Escolha
Fechar
Cia\tVoo\tSaída\tChegada\tOrigem\tDestino(s)\tEsc\tEquip.\tTipo\tClasse\t \tFamília\tBagagem\tTotal\t 
GOL(G3)
	
G3 1672
11/06/2026 - 22:45
12/06/2026 - 01:45
São Paulo - guarulhos
Maceió - zumbi dos palmares
0
738
OW
U
 	 	 
 	LIGHT 	
	
R$ 1394,33

R$ 1394,33`;

describe('parseImportedRoteiroAereo - formato REXTUR', () => {
  it('extrai voo com troca de aeronave (conexão)', () => {
    const result = parseImportedRoteiroAereo(EXAMPLE_REXTUR_CONNECTION, new Date(2026, 0, 1));
    expect(result).toHaveLength(2);

    expect(result[0].cia_aerea).toBe('Gol');
    expect(result[0].data_voo).toBe('2026-06-11');
    expect(result[0].hora_saida).toBe('18:55');
    expect(result[0].aeroporto_saida).toBe('GRU');
    expect(result[0].hora_chegada).toBe('20:05');
    expect(result[0].aeroporto_chegada).toBe('GIG');
    expect(result[0].tipo_voo).toBe('1 escala');
    expect(result[0].trecho).toBe('São Paulo - Maceió');
    expect(result[0].classe_reserva).toBe('G3');
    expect(result[0].valor_total).toBe(1361.37);

    expect(result[1].cia_aerea).toBe('Gol');
    expect(result[1].data_voo).toBe('2026-06-12');
    expect(result[1].hora_saida).toBe('00:25');
    expect(result[1].aeroporto_saida).toBe('GIG');
    expect(result[1].hora_chegada).toBe('03:10');
    expect(result[1].aeroporto_chegada).toBe('MCZ');
    expect(result[1].tipo_voo).toBe('1 escala');
    expect(result[1].trecho).toBe('São Paulo - Maceió');
    expect(result[1].classe_reserva).toBe('G3');
    expect(result[1].valor_total).toBe(1361.37);
  });

  it('extrai voo direto', () => {
    const result = parseImportedRoteiroAereo(EXAMPLE_REXTUR_DIRECT, new Date(2026, 0, 1));
    expect(result).toHaveLength(1);

    expect(result[0].cia_aerea).toBe('Gol');
    expect(result[0].data_voo).toBe('2026-06-11');
    expect(result[0].hora_saida).toBe('22:45');
    expect(result[0].aeroporto_saida).toBe('GRU');
    expect(result[0].hora_chegada).toBe('01:45');
    expect(result[0].aeroporto_chegada).toBe('MCZ');
    expect(result[0].tipo_voo).toBe('Voo direto');
    expect(result[0].trecho).toBe('São Paulo - Maceió');
    expect(result[0].classe_reserva).toBe('G3');
    expect(result[0].valor_total).toBe(1394.33);
  });
});
