import { describe, expect, it } from 'vitest';

import {
  resolveReceiptCommissions,
  resolveVendaCommission,
  resolveVendaCommissions,
  type CommissionContext
} from '$lib/server/comissoes';

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

  it('applies meta atingida using the seller monthly aggregate, not each isolated sale', () => {
    const produtoId = 'produto-geral';
    const context = buildContext({
      metaPlanejada: 1000,
      tipoProdutoMap: {
        [produtoId]: {
          id: produtoId,
          nome: 'Pacote',
          tipo: 'Pacote',
          regra_comissionamento: 'geral',
          soma_na_meta: true,
          usa_meta_produto: false,
          descontar_meta_geral: false,
          exibe_kpi_comissao: false
        }
      },
      regrasMap: {
        regra: {
          id: 'regra',
          tipo: 'GERAL',
          meta_nao_atingida: 1,
          meta_atingida: 2,
          super_meta: 3,
          commission_tier: []
        }
      },
      regraProdutoMap: {
        [produtoId]: {
          produto_id: produtoId,
          rule_id: 'regra',
          fix_meta_nao_atingida: null,
          fix_meta_atingida: null,
          fix_super_meta: null
        }
      }
    });

    const rows = [
      {
        id: 'venda-1',
        company_id: 'empresa-1',
        valor_total: 600,
        valor_total_bruto: 600,
        valor_total_pago: 600,
        valor_nao_comissionado: 0,
        desconto_comercial_valor: 0,
        data_venda: '2026-04-10',
        vendedor_id: 'vendedor-1',
        recibos: [
          {
            id: 'recibo-1',
            produto_id: produtoId,
            valor_total: 600,
            valor_taxas: 0,
            valor_rav: 0,
            tipo_produtos: {
              id: produtoId,
              nome: 'Pacote',
              tipo: 'Pacote',
              regra_comissionamento: 'geral',
              soma_na_meta: true,
              usa_meta_produto: false,
              descontar_meta_geral: false,
              exibe_kpi_comissao: false
            }
          }
        ]
      },
      {
        id: 'venda-2',
        company_id: 'empresa-1',
        valor_total: 500,
        valor_total_bruto: 500,
        valor_total_pago: 500,
        valor_nao_comissionado: 0,
        desconto_comercial_valor: 0,
        data_venda: '2026-04-12',
        vendedor_id: 'vendedor-1',
        recibos: [
          {
            id: 'recibo-2',
            produto_id: produtoId,
            valor_total: 500,
            valor_taxas: 0,
            valor_rav: 0,
            tipo_produtos: {
              id: produtoId,
              nome: 'Pacote',
              tipo: 'Pacote',
              regra_comissionamento: 'geral',
              soma_na_meta: true,
              usa_meta_produto: false,
              descontar_meta_geral: false,
              exibe_kpi_comissao: false
            }
          }
        ]
      }
    ] as any[];

    const isolated = resolveVendaCommission(rows[0], context);
    const grouped = resolveVendaCommissions(rows, context);

    expect(isolated.percentual).toBe(1);
    expect(grouped.get('venda-1')?.percentual).toBe(2);
    expect(grouped.get('venda-1')?.valorComissao).toBeCloseTo(12, 2);
    expect(grouped.get('venda-2')?.valorComissao).toBeCloseTo(10, 2);
  });

  it('applies super meta using the seller monthly aggregate', () => {
    const produtoId = 'produto-geral';
    const context = buildContext({
      metaPlanejada: 1000,
      tipoProdutoMap: {
        [produtoId]: {
          id: produtoId,
          nome: 'Pacote',
          tipo: 'Pacote',
          regra_comissionamento: 'geral',
          soma_na_meta: true,
          usa_meta_produto: false,
          descontar_meta_geral: false,
          exibe_kpi_comissao: false
        }
      },
      regrasMap: {
        regra: {
          id: 'regra',
          tipo: 'GERAL',
          meta_nao_atingida: 1,
          meta_atingida: 2,
          super_meta: 3,
          commission_tier: []
        }
      },
      regraProdutoMap: {
        [produtoId]: {
          produto_id: produtoId,
          rule_id: 'regra',
          fix_meta_nao_atingida: null,
          fix_meta_atingida: null,
          fix_super_meta: null
        }
      }
    });

    const rows = [
      {
        id: 'venda-1',
        company_id: 'empresa-1',
        valor_total: 700,
        valor_total_bruto: 700,
        valor_total_pago: 700,
        valor_nao_comissionado: 0,
        desconto_comercial_valor: 0,
        data_venda: '2026-04-10',
        vendedor_id: 'vendedor-1',
        recibos: [
          {
            id: 'recibo-1',
            produto_id: produtoId,
            valor_total: 700,
            valor_taxas: 0,
            valor_rav: 0,
            tipo_produtos: {
              id: produtoId,
              nome: 'Pacote',
              tipo: 'Pacote',
              regra_comissionamento: 'geral',
              soma_na_meta: true,
              usa_meta_produto: false,
              descontar_meta_geral: false,
              exibe_kpi_comissao: false
            }
          }
        ]
      },
      {
        id: 'venda-2',
        company_id: 'empresa-1',
        valor_total: 600,
        valor_total_bruto: 600,
        valor_total_pago: 600,
        valor_nao_comissionado: 0,
        desconto_comercial_valor: 0,
        data_venda: '2026-04-12',
        vendedor_id: 'vendedor-1',
        recibos: [
          {
            id: 'recibo-2',
            produto_id: produtoId,
            valor_total: 600,
            valor_taxas: 0,
            valor_rav: 0,
            tipo_produtos: {
              id: produtoId,
              nome: 'Pacote',
              tipo: 'Pacote',
              regra_comissionamento: 'geral',
              soma_na_meta: true,
              usa_meta_produto: false,
              descontar_meta_geral: false,
              exibe_kpi_comissao: false
            }
          }
        ]
      }
    ] as any[];

    const grouped = resolveVendaCommissions(rows, context);

    expect(grouped.get('venda-1')?.percentual).toBe(3);
    expect(grouped.get('venda-1')?.valorComissao).toBeCloseTo(21, 2);
    expect(grouped.get('venda-2')?.valorComissao).toBeCloseTo(18, 2);
  });

  it('keeps the full insurance receipt percentage but splits only the insurance complement for KPIs', () => {
    const produtoId = 'produto-seguro';
    const context = buildContext({
      metaPlanejada: 10000,
      tipoProdutoMap: {
        [produtoId]: {
          id: produtoId,
          nome: 'Seguro Viagem',
          tipo: 'Seguro',
          regra_comissionamento: 'geral',
          soma_na_meta: true,
          usa_meta_produto: true,
          meta_produto_valor: 500,
          comissao_produto_meta_pct: 10,
          descontar_meta_geral: true,
          exibe_kpi_comissao: true
        }
      },
      regrasMap: {
        regra: {
          id: 'regra',
          tipo: 'GERAL',
          meta_nao_atingida: 0.8,
          meta_atingida: 1,
          super_meta: 1.2,
          commission_tier: []
        }
      },
      regraProdutoMap: {
        [produtoId]: {
          produto_id: produtoId,
          rule_id: 'regra',
          fix_meta_nao_atingida: null,
          fix_meta_atingida: null,
          fix_super_meta: null
        }
      }
    });

    const rows = [
      {
        id: 'venda-seguro',
        company_id: 'empresa-1',
        valor_total: 1000,
        valor_total_bruto: 1000,
        valor_total_pago: 1000,
        valor_nao_comissionado: 0,
        desconto_comercial_valor: 0,
        data_venda: '2026-04-10',
        vendedor_id: 'vendedor-1',
        recibos: [
          {
            id: 'recibo-seguro',
            produto_id: produtoId,
            valor_total: 1000,
            valor_taxas: 0,
            valor_rav: 0,
            tipo_produtos: {
              id: produtoId,
              nome: 'Seguro Viagem',
              tipo: 'Seguro',
              regra_comissionamento: 'geral',
              soma_na_meta: true,
              usa_meta_produto: true,
              meta_produto_valor: 500,
              comissao_produto_meta_pct: 10,
              descontar_meta_geral: true,
              exibe_kpi_comissao: true
            }
          }
        ]
      }
    ] as any[];

    const receipt = resolveReceiptCommissions(rows, context).get('recibo-seguro');

    expect(receipt?.percentual).toBeCloseTo(10, 2);
    expect(receipt?.valorComissao).toBeCloseTo(100, 2);
    expect(receipt?.percentualComissaoGeral).toBeCloseTo(0.8, 2);
    expect(receipt?.valorComissaoGeral).toBeCloseTo(8, 2);
    expect(receipt?.percentualSeguro).toBeCloseTo(9.2, 2);
    expect(receipt?.valorComissaoSeguro).toBeCloseTo(92, 2);
  });
});
