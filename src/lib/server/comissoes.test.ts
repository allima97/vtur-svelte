import { describe, expect, it } from 'vitest';

import { resolveVendaCommission, type CommissionContext } from '$lib/server/comissoes';

function buildContext(overrides: Partial<CommissionContext> = {}): CommissionContext {
  return {
    params: {
      usar_taxas_na_meta: true,
      foco_valor: 'bruto',
      foco_faturamento: 'bruto',
      conciliacao_sobrepoe_vendas: false,
      conciliacao_regra_ativa: false,
      conciliacao_tipo: 'GERAL',
      conciliacao_meta_nao_atingida: null,
      conciliacao_meta_atingida: null,
      conciliacao_super_meta: null,
      conciliacao_tiers: [],
      conciliacao_faixas_loja: []
    },
    regrasMap: {},
    regraProdutoMap: {},
    regraProdutoPacoteMap: {},
    regraTipoPacoteMap: {},
    tipoProdutoMap: {},
    metaPlanejada: 100000,
    metaProdutoMap: {},
    ...overrides
  };
}

describe('resolveVendaCommission', () => {
  it('returns the configured fixed percentage for Passagem Facial', () => {
    const produtoId = 'produto-passagem-facial';
    const context = buildContext({
      tipoProdutoMap: {
        [produtoId]: {
          id: produtoId,
          nome: 'Passagem Facial',
          tipo: 'Passagem Facial',
          regra_comissionamento: 'geral',
          soma_na_meta: true,
          usa_meta_produto: false,
          descontar_meta_geral: false,
          exibe_kpi_comissao: false
        }
      },
      regraTipoPacoteMap: {
        'passagem facial': {
          rule_id: null,
          fix_meta_nao_atingida: 0.7,
          fix_meta_atingida: 1,
          fix_super_meta: 1
        }
      }
    });

    const resultado = resolveVendaCommission(
      {
        company_id: 'empresa-1',
        valor_total: 10000,
        valor_total_bruto: 10000,
        valor_total_pago: 10000,
        valor_nao_comissionado: 0,
        desconto_comercial_valor: 0,
        data_venda: '2026-04-10',
        vendedor_id: 'vendedor-1',
        recibos: [
          {
            id: 'recibo-1',
            produto_id: produtoId,
            valor_total: 10000,
            valor_taxas: 1142.86,
            valor_rav: 0,
            tipo_pacote: 'Passagem Facial',
            tipo_produtos: {
              id: produtoId,
              nome: 'Passagem Facial',
              tipo: 'Passagem Facial',
              regra_comissionamento: 'geral',
              soma_na_meta: true,
              usa_meta_produto: false,
              descontar_meta_geral: false,
              exibe_kpi_comissao: false
            }
          }
        ]
      } as any,
      context
    );

    expect(resultado.valorComissao).toBeCloseTo(62, 2);
    expect(resultado.percentual).toBe(0.7);
    expect(resultado.regraNome).toBe('Fixo');
  });

  it('returns the configured fixed percentage for VBI differentiated products', () => {
    const produtoId = 'produto-vbi';
    const context = buildContext({
      tipoProdutoMap: {
        [produtoId]: {
          id: produtoId,
          nome: 'Transporte Aereo',
          tipo: 'Passagem Aerea',
          regra_comissionamento: 'diferenciado',
          soma_na_meta: true,
          usa_meta_produto: false,
          descontar_meta_geral: true,
          exibe_kpi_comissao: true
        }
      },
      regraTipoPacoteMap: {
        vbi: {
          rule_id: null,
          fix_meta_nao_atingida: 0.7,
          fix_meta_atingida: 1,
          fix_super_meta: 1
        }
      }
    });

    const resultado = resolveVendaCommission(
      {
        company_id: 'empresa-1',
        valor_total: 3000,
        valor_total_bruto: 3000,
        valor_total_pago: 3000,
        valor_nao_comissionado: 0,
        desconto_comercial_valor: 0,
        data_venda: '2026-04-10',
        vendedor_id: 'vendedor-1',
        recibos: [
          {
            id: 'recibo-2',
            produto_id: produtoId,
            valor_total: 3000,
            valor_taxas: 450,
            valor_rav: 0,
            tipo_pacote: 'Vbi',
            tipo_produtos: {
              id: produtoId,
              nome: 'Transporte Aereo',
              tipo: 'Passagem Aerea',
              regra_comissionamento: 'diferenciado',
              soma_na_meta: true,
              usa_meta_produto: false,
              descontar_meta_geral: true,
              exibe_kpi_comissao: true
            }
          }
        ]
      } as any,
      context
    );

    expect(resultado.valorComissao).toBeCloseTo(17.85, 2);
    expect(resultado.percentual).toBe(0.7);
    expect(resultado.regraNome).toBe('Diferenciado');
  });
});