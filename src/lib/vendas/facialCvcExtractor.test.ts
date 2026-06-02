import { describe, expect, it } from 'vitest';
import { extractFacialCvcFromText } from './facialCvcExtractor';

describe('extractFacialCvcFromText', () => {
  it('extrai passageiros CHD no espelho Facial CVC', () => {
    const result = extractFacialCvcFromText(`
      Venda Bilhete Aéreo Internacional

      Reserva CVC
      Número  305062789  Log de Emails Pedido Data da Reserva 01/06/2026 19:55:02 Validade: 03/06/2026 00:00:00
      Filial 5630 - LOJA SHOPPING CENTER NORTE Tipo de Venda DIRETA Vendedor MARCIO LUIS PEREIRA

      Reserva Cia. Aérea
      Número Provedor Cia. Aérea Localizador Loc Vôos Emissão Status Solic.Cartão
      32617634 LHG AZ - ITA AIRWAYS KSO6TA HST HST

      Trechos
      Vôo Aeroporto Origem Partida Aeroporto Destino Chegada Familia Office Id
      Cia. Número Data Hora Data Hora
      AZ 674 FCO - ROME FIUMICINO 13/07/2026 22:00 GRU - GUARULHOS 14/07/2026 05:20 Business Basic ATVM

      Passageiros
      Nome Sobrenome Tipo Assento Tarifa
      (sem as Taxas) Taxa DU Taxas Bilhete Data de
      Nascimento
      ANTONIO TORRES BLANCA ADT 18.592,97 1.301,51 1.908,08 21/02/1947
      LIZ TORRES BLANCA CHD 13.946,19 976,23 1.834,18 06/09/2020
      LUCINDA TORRES BLANCA ADT 18.592,97 1.301,51 1.908,08 20/02/1978

      Contratante
      Nome do Contratante Recibo
      LUCINDA MARIA DOS SANTOS 5630-0000084995

      Caixa
      Código Descrição Valor
      5420 CARTÃO CIA AEREA 56.782,47
      5202 DEPÓSITO FRANQUEADO 3.579,25

      Cartão cia aérea (R$)
      Cartão cia aérea 56.782,47
    `);

    const contrato = result.contratos[0];
    const passageiros = contrato.passageiros ?? [];
    expect(contrato.reserva_numero).toBe('305062789');
    expect(contrato.contrato_numero).toBe('5630-0000084995');
    expect(passageiros.map((passageiro) => passageiro.nome)).toEqual([
      'ANTONIO TORRES BLANCA',
      'LIZ TORRES BLANCA',
      'LUCINDA TORRES BLANCA'
    ]);
    expect(passageiros[1].nascimento).toBe('2020-09-06');
    expect(contrato.total_pago).toBeCloseTo(60361.72, 2);
    expect(contrato.taxa_du).toBeCloseTo(3579.25, 2);
    expect(contrato.taxas_embarque).toBeCloseTo(5650.34, 2);
  });
});
