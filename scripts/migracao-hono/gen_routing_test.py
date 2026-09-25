import json,sys,os
report=json.load(open(sys.argv[1])); OUT=sys.argv[2]
MC={'GET':'Get','POST':'Post','PUT':'Put','PATCH':'Patch','DELETE':'Delete'}
doms=sorted(set(r['dom'] for r in report))
for dom in doms:
    rs=[r for r in report if r['dom']==dom]
    mocks=[];cases=[]
    for r in rs:
        names=[f"handle{r['prefix']}{MC[m]}" for m in r['methods']]
        mocks.append(f"vi.mock('./{r['mod']}', () => ({{ {', '.join(f'{n}: spy({n!r})' for n in names)} }}));")
        url='/api/v1/'+dom+('' if r['hono']=='/' else r['hono'].replace(':id','id-123'))
        exp={'id':'id-123'} if r['param'] else {}
        for m,n in zip(r['methods'],names):
            cases.append(f"  ['{m}', '{url}', '{n}', {json.dumps(exp)}],")
    # métodos não exportados: para cada rota, um método que ela não tem
    neg=[]
    for r in rs:
        # Evita métodos de rotas /:param com o mesmo nº de segmentos: chamado direto no
        # Hono, '/create' com esse método cairia em '/:id'. Em produção isso não ocorre,
        # porque a ponte +server.ts só exporta os métodos da rota e o SvelteKit
        # responde 405 antes de chegar ao Hono.
        nseg=len([x for x in r['hono'].split('/') if x])
        colide=set() if r['param'] else {m for o in rs if o['param'] and len([x for x in o['hono'].split('/') if x])==nseg for m in o['methods']}
        missing=[m for m in ['PUT','PATCH','DELETE','POST','GET'] if m not in r['methods'] and m not in colide]
        if missing:
            url='/api/v1/'+dom+('' if r['hono']=='/' else r['hono'].replace(':id','id-123'))
            neg.append(f"  ['{missing[0]}', '{url}'],")
    t=f"""/**
 * Roteamento de /api/v1/{dom}/* no Hono (gerado por gen_routing_test.py).
 *
 * Os handlers foram movidos SEM alteração dos +server.ts originais (identidade
 * textual verificada na migração). Este teste garante que cada método + URL
 * chega no handler certo, com os mesmos params, tanto pelo app quanto pelo
 * catch-all, e que método não exportado antes continua sem handler (404).
 */
import {{ beforeEach, describe, expect, it, vi }} from 'vitest';

const calls = vi.hoisted(() => [] as Array<{{ name: string; params: Record<string, unknown> }}>);
const spy = vi.hoisted(
  () => (name: string) => async (event: {{ params: Record<string, unknown> }}) => {{
    calls.push({{ name, params: {{ ...event.params }} }});
    return new Response(name, {{ status: 200 }});
  }},
);

{chr(10).join(mocks)}

import {{ apiApp }} from '../../app';
import * as catchAll from '../../../../../routes/api/v1/[...path]/+server';

const CASES: Array<[string, string, string, Record<string, string>]> = [
{chr(10).join(cases)}
];

const SEM_HANDLER: Array<[string, string]> = [
{chr(10).join(neg)}
];

function ev(method: string, path: string) {{
  const request = new Request(`https://vturapp.test${{path}}`, {{ method }});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {{ request, url: new URL(request.url), params: {{}}, locals: {{}}, platform: undefined }} as any;
}}

beforeEach(() => {{
  calls.length = 0;
}});

describe('{dom} → handler', () => {{
  it.each(CASES)('%s %s → %s', async (method, path, handler, params) => {{
    const e = ev(method, path);
    const res = await apiApp.fetch(e.request, {{ event: e }});
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(handler);
    expect(calls).toEqual([{{ name: handler, params }}]);
  }});

  it('catch-all também encaminha', async () => {{
    for (const [method, path, handler, params] of CASES) {{
      calls.length = 0;
      const fn = (catchAll as Record<string, (e: unknown) => Promise<Response>>)[method];
      const res = await fn(ev(method, path));
      expect(await res.text()).toBe(handler);
      expect(calls).toEqual([{{ name: handler, params }}]);
    }}
  }});

  it('método que não existia continua sem handler', async () => {{
    for (const [method, path] of SEM_HANDLER) {{
      const e = ev(method, path);
      const res = await apiApp.fetch(e.request, {{ event: e }});
      expect(res.status).toBe(404);
    }}
    expect(calls).toEqual([]);
  }});
}});
"""
    open(os.path.join(OUT,'src/lib/server/api/routes',dom,'routing.test.ts'),'w').write(t)
    print(dom,len(cases),len(neg))
