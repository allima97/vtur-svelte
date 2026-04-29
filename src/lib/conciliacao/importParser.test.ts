import { describe, expect, it } from 'vitest';
import { parseConciliacaoImportFile } from './importParser';

describe('parseConciliacaoImportFile', () => {
  it('preserves BR money values from HTML .xls exports', async () => {
    const html = `
      <table>
        <tr>
          <th>DOCUMENTO</th>
          <th>DESCRICAO</th>
          <th>LANCAMENTOS</th>
          <th>TAXAS</th>
          <th>DESCONTOS</th>
          <th>ABATIMENTOS</th>
          <th>CALCULADA LOJA</th>
          <th>REPASSADA</th>
          <th>VISAO MASTER</th>
          <th>&nbsp;</th>
          <th>&nbsp;</th>
          <th>OPFAX</th>
          <th>SALDO</th>
        </tr>
        <tr>
          <td>5630-0000084046</td>
          <td>BAIXA DE RECIBO</td>
          <td><div align="right">22.356,00</div></td>
          <td><div align="right">2.700,00</div></td>
          <td>0,00</td>
          <td>0,00</td>
          <td><a href="#">1.867,32</a></td>
          <td>0,00</td>
          <td>1.867,32</td>
          <td>0,00</td>
          <td>0,00</td>
          <td>0,00</td>
          <td>1.867,32</td>
        </tr>
      </table>
    `;
    const file = new File([html], 'extrato_movimento.xls', { type: 'application/vnd.ms-excel' });

    const parsed = await parseConciliacaoImportFile(file);
    const row = parsed.linhas[0];

    expect(row.documento).toBe('5630-0000084046');
    expect(row.valor_lancamentos).toBe(22356);
    expect(row.valor_taxas).toBe(2700);
    expect(row.valor_calculada_loja).toBe(1867.32);
  });
});
