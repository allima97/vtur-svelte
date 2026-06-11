import { describe, it, expect } from 'vitest';
import { parseImportedRoteiroHotels } from './roteiroHotelImport';

const EXAMPLE_TEXT = `Selecionado
Excluir
11 de ago - 17 de ago (7 dias e 6 noites)
Maceio - Alagoas
Preferencial
Hotel Expresso R1 Maceio
Hotel Expresso R1 Maceio
Avenida joão davino 386
1 Standard
Café da manhã
Reembolsável
Total (2 Adultos)
R$ 1.359,77
Detalhes`;

describe('parseImportedRoteiroHotels', () => {
  it('extrai todos os campos do exemplo de importação de hotel', () => {
    const result = parseImportedRoteiroHotels(EXAMPLE_TEXT, new Date(2026, 0, 1));
    expect(result).toHaveLength(1);

    const hotel = result[0];
    expect(hotel.cidade).toBe('Maceio');
    expect(hotel.hotel).toBe('Hotel Expresso R1 Maceio');
    expect(hotel.endereco).toBe('Avenida joão davino 386');
    expect(hotel.data_inicio).toBe('2026-08-11');
    expect(hotel.data_fim).toBe('2026-08-17');
    expect(hotel.noites).toBe(6);
    expect(hotel.qtd_apto).toBe(1);
    expect(hotel.apto).toBe('Standard');
    expect(hotel.regime).toBe('Café da Manhã');
    expect(hotel.tipo_tarifa).toBe('Reembolsável');
    expect(hotel.qtd_adultos).toBe(2);
    expect(hotel.qtd_criancas).toBe(0);
    expect(hotel.valor_final).toBe(1359.77);
  });

  it('ignora linhas de controle e mantém hotel com dígitos no nome', () => {
    const text = `Selecionado
Excluir
05 de jan - 10 de jan (6 dias e 5 noites)
São Paulo - SP
Preferencial
Hotel F1 Congonhas
Hotel F1 Congonhas
Rua das Flores, 123
1 Duplo
Café da manhã
Não Reembolsável
Total (1 Adulto, 1 Criança)
R$ 899,00
Detalhes`;

    const result = parseImportedRoteiroHotels(text, new Date(2026, 0, 1));
    expect(result).toHaveLength(1);
    expect(result[0].hotel).toBe('Hotel F1 Congonhas');
    expect(result[0].endereco).toBe('Rua das Flores, 123');
    expect(result[0].qtd_adultos).toBe(1);
    expect(result[0].qtd_criancas).toBe(1);
    expect(result[0].tipo_tarifa).toBe('Não Reembolsável');
    expect(result[0].valor_final).toBe(899);
  });

  it('importa múltiplos hotéis e ordena por data', () => {
    const text = `01 de fev - 03 de fev (3 dias e 2 noites)
Rio de Janeiro - RJ
Hotel A
Av. Atlântica, 500
1 Standard
Café da manhã
Reembolsável
Total (2 Adultos)
R$ 800,00
---
10 de fev - 12 de fev (3 dias e 2 noites)
Búzios - RJ
Hotel B
Rua das Pedras, 10
1 Suíte
Meia Pensão
Reembolsável
Total (2 Adultos)
R$ 1.200,00`;

    const result = parseImportedRoteiroHotels(text, new Date(2026, 0, 1));
    expect(result).toHaveLength(2);
    expect(result[0].hotel).toBe('Hotel A');
    expect(result[0].data_inicio).toBe('2026-02-01');
    expect(result[1].hotel).toBe('Hotel B');
    expect(result[1].data_inicio).toBe('2026-02-10');
  });

  it('retorna lista vazia quando não encontra hotéis', () => {
    const result = parseImportedRoteiroHotels('apenas texto sem dados de hotel', new Date());
    expect(result).toHaveLength(0);
  });
});
