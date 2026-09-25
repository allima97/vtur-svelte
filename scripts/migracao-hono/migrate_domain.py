"""Migra rotas src/routes/api/v1/<dominio>/** para Hono, movendo o corpo SEM alteração.
Uso: python3 migrate_domain.py <SRC_ROOT> <OUT_ROOT> <dominio> [<dominio>...]
"""
import re, os, sys, json
SRC_ROOT, OUT_ROOT = sys.argv[1], sys.argv[2]
DOMAINS = sys.argv[3:]
MC={'GET':'Get','POST':'Post','PUT':'Put','PATCH':'Patch','DELETE':'Delete'}
SKIP_DEPTH = 8   # pastas; arquivos mais fundos não podem ser copiados do computador

def camel(seg):
    seg=seg.strip('[]')
    return ''.join(p[:1].upper()+p[1:] for p in re.split(r'[-_.]', seg) if p)

report=[]
for dom in DOMAINS:
    base=os.path.join(SRC_ROOT,'src/routes/api/v1',dom)
    files=[]
    for r,ds,fs in os.walk(base):
        if '+server.ts' in fs: files.append(os.path.relpath(r,base))
    files=sorted(files)
    mods=[]
    for rel in files:
        rel='' if rel=='.' else rel.replace(os.sep,'/')
        segs=[s for s in rel.split('/') if s]
        mod='-'.join(s.strip('[]').replace('.','-') for s in segs) or 'root'
        prefix=camel(dom)+''.join(camel(s) for s in segs)
        hono='/'+'/'.join((':'+s[1:-1]) if s.startswith('[') else s for s in segs)
        hasParam=any(s.startswith('[') for s in segs)
        fp=os.path.join(base,rel,'+server.ts')
        raw=open(fp,newline='').read(); crlf='\r\n' in raw; s=raw.replace('\r\n','\n')
        methods=[]
        def repl_fn(m):
            methods.append(m.group(1)); return f'export async function handle{prefix}{MC[m.group(1)]}(event: RequestEvent) {{'
        new=re.sub(r'export async function (GET|POST|PUT|PATCH|DELETE)\(event(?:: RequestEvent)?\) \{',repl_fn,s)
        # variante com tipo inline: (event: import('@sveltejs/kit').RequestEvent) — assinatura preservada
        def repl_fn_inline(m):
            methods.append(m.group(1)); return f'export async function handle{prefix}{MC[m.group(1)]}(event: {m.group(2)}) {{'
        new=re.sub(r"export async function (GET|POST|PUT|PATCH|DELETE)\(event: (import\('@sveltejs/kit'\)\.RequestEvent)\) \{",repl_fn_inline,new)
        def repl_const(m):
            methods.append(m.group(1)); arg=m.group(2)
            arg = f'{arg}: RequestEvent' if ':' not in arg else arg
            return f'export const handle{prefix}{MC[m.group(1)]} = async ({arg}) => {{'
        new=re.sub(r'export const (GET|POST|PUT|PATCH|DELETE): RequestHandler = async \((event|\{[^)]*\})\) => \{',repl_const,new)
        assert methods, fp
        rh_line=None; rh_kit=None
        m=re.search(r"import type \{ RequestHandler \} from (['\"])\./\$types\1;\n",new)
        if m:
            rh_line=m.group(0)
            if new.count('RequestHandler')==1:
                new=new.replace(rh_line,'',1)
            else:
                # RequestHandler usado em outro ponto (ex.: Parameters<RequestHandler>[0]):
                # './$types' não existe fora de src/routes, então usa o tipo genérico do kit (só tipo).
                kit_line=rh_line.replace("'./$types'","'@sveltejs/kit'").replace('"./$types"',"'@sveltejs/kit'")
                new=new.replace(rh_line,kit_line,1)
                rh_kit=(rh_line,kit_line)
                rh_line=None
        added_import=not re.search(r'\bRequestEvent\b',s)
        if added_import:
            new="import type { RequestEvent } from '@sveltejs/kit';\n"+new
        # imports relativos
        relfix=[rh_kit] if rh_kit else []
        def fix_rel(m):
            q,path=m.group(1),m.group(2)
            target=os.path.normpath(os.path.join('src/routes/api/v1',dom,rel,path))
            if target.endswith('/+server'):
                return None
            newp=os.path.relpath(target, os.path.join('src/lib/server/api/routes',dom))
            if not newp.startswith('.'): newp='./'+newp
            relfix.append((f'{q}{path}{q}',f'{q}{newp}{q}'))
            return f'{q}{newp}{q}'
        # imports de outro +server do mesmo domínio: GET as X from "../ranking/+server"
        def fix_server(m):
            meth,alias,q,path=m.group(1),m.group(2),m.group(3),m.group(4)
            tsegs=[x for x in os.path.normpath(os.path.join(rel,path)).split('/') if x and x!='+server']
            tprefix=camel(dom)+''.join(camel(x) for x in tsegs)
            tmod='-'.join(x.strip('[]').replace('.','-') for x in tsegs) or 'root'
            orig=m.group(0); rep=f'import {{ handle{tprefix}{MC[meth]} as {alias} }} from {q}./{tmod}{q};'
            relfix.append((orig,rep)); return rep
        new=re.sub(r"(?<=from )(['\"])(\.{1,2}/[^'\"]+)\1",lambda m: fix_rel(m) or m.group(0),new)
        new=re.sub(r"import \{ (GET|POST|PUT|PATCH|DELETE) as (\w+) \} from (['\"])(\.{1,2}/[^'\"]+/\+server)\3;",fix_server,new)
        header=f'// Migrado para Hono de src/routes/api/v1/{dom}/{rel+"/" if rel else ""}+server.ts — corpo IDÊNTICO ao original\n// (só nome/assinatura do handler e caminhos de import mudaram). Ver src/lib/server/api/app.ts.\n'
        new=header+new
        # identidade
        def norm(t, is_new):
            if is_new:
                t=t[len(header):]
                if added_import: t=t.replace("import type { RequestEvent } from '@sveltejs/kit';\n",'',1)
                for a,b in relfix: t=t.replace(b,a)
                if rh_line: t=rh_line+t
            else:
                if rh_line: t=rh_line+t.replace(rh_line,'',1)
            t=re.sub(r"export async function \w+\(event(?:: RequestEvent|: import\('@sveltejs/kit'\)\.RequestEvent)?\) \{",'export H {',t)
            t=re.sub(r'export const \w+(?:: RequestHandler)? = async \((event|\{[^)]*?\})(?:: RequestEvent)?\) => \{','export H {',t)
            return t
        same=norm(new,True)==norm(s,False)
        report.append({'dom':dom,'mod':mod,'rel':rel,'methods':methods,'hono':hono,'prefix':prefix,'param':hasParam,'same':same,'relfix':relfix,'rh':bool(rh_line)})
        os.makedirs(os.path.join(OUT_ROOT,'src/lib/server/api/routes',dom),exist_ok=True)
        w=lambda p,t: open(p,'w',newline='').write(t.replace('\n','\r\n') if crlf else t)
        w(os.path.join(OUT_ROOT,'src/lib/server/api/routes',dom,mod+'.ts'),new)
        # tipos exportados continuam disponíveis no caminho antigo
        types=re.findall(r'^export type (\w+)',s,flags=re.M)
        typeexp=f"export type {{ {', '.join(types)} }} from '$lib/server/api/routes/{dom}/{mod}';\n" if types else ''
        exports='\n'.join(f'export const {m} = apiHandler;' for m in methods)
        bdir=os.path.join(OUT_ROOT,'src/routes/api/v1',dom,rel); os.makedirs(bdir,exist_ok=True)
        w(os.path.join(bdir,'+server.ts'),f"// Migrado para Hono: implementação em src/lib/server/api/routes/{dom}/{mod}.ts\nimport {{ apiHandler }} from '$lib/server/api/sveltekit';\n{typeexp}\n{exports}\n")
        mods.append(report[-1])
    # router
    order=sorted(mods,key=lambda r:(r['param'], -r['hono'].count('/'), r['hono']))
    imps=[]; routes=[]
    for r in mods:
        names=[f"handle{r['prefix']}{MC[m]}" for m in r['methods']]
        imps.append(f"import {{ {', '.join(names)} }} from './{r['mod']}';")
    for r in order:
        for m in r['methods']:
            n=f"handle{r['prefix']}{MC[m]}"
            ev="withRouteParams(c.env.event, c.req.param())" if r['param'] else "c.env.event"
            routes.append(f"  .{m.lower()}('{r['hono']}', (c) => {n}({ev}))")
    needp=any(r['param'] for r in mods)
    idx="import { Hono } from 'hono';\nimport type { ApiEnv } from '../../types';\n"+("import { withRouteParams } from '../../params';\n" if needp else '')+'\n'.join(imps)+f"\n\n// /api/v1/{dom}/* atendido pelo Hono (gerado por migrate_domain.py). Estáticas antes de '/:param'.\nexport const {camel(dom)[0].lower()+camel(dom)[1:]}Routes = new Hono<ApiEnv>()\n"+'\n'.join(routes)+';\n'
    open(os.path.join(OUT_ROOT,'src/lib/server/api/routes',dom,'index.ts'),'w').write(idx)
json.dump(report,open(os.path.join(OUT_ROOT,'report_'+'_'.join(DOMAINS)+'.json'),'w'),indent=1)
for r in report: print('OK ' if r['same'] else 'DIF', r['dom'], r['mod'], r['methods'], r['hono'], 'relfix' if r['relfix'] else '', 'rh' if r['rh'] else '')
