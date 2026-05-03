import { createSupabaseServerClient } from '$lib/db/supabase';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle } from '@sveltejs/kit';
import {
	descobrirModulo,
	listarModulosComHeranca,
	MAPA_MODULOS,
	MODULO_ALIASES,
	isSystemModuleDisabled,
	isMissingSystemModuleSettingsTable
} from '$lib/admin/modules';
import {
	extractUserTypeName,
	isSystemAdminRole,
	isMasterRole,
	normalizeUserType
} from '$lib/server/admin';
import { hasVerifiedTotpFactor, normalizeMfaRedirectPath } from '$lib/server/authMfa';
import { resolveDashboardPathByUserType } from '$lib/server/dashboardRedirect';

const permLevel = (p?: string | null): number => {
	switch ((p || '').toLowerCase()) {
		case 'admin': return 5;
		case 'delete': return 4;
		case 'edit': return 3;
		case 'create': return 2;
		case 'view': return 1;
		default: return 0;
	}
};

const normalizePermissao = (value?: string | null) => {
	const perm = (value || '').toLowerCase();
	if (perm === 'admin') return 'admin';
	if (perm === 'delete') return 'delete';
	if (perm === 'edit') return 'edit';
	if (perm === 'create') return 'create';
	if (perm === 'view') return 'view';
	return 'none';
};

const setPerm = (perms: Record<string, string>, key: string, perm: string) => {
	if (!key) return;
	const normalizedKey = key.toLowerCase();
	const atual = perms[normalizedKey] ?? 'none';
	perms[normalizedKey] = permLevel(perm) > permLevel(atual) ? perm : atual;
};

const normalizeModuloKey = (value?: string | null) => {
	const raw = String(value || '').trim().toLowerCase();
	if (!raw) return '';
	return MODULO_ALIASES[raw] || raw.replace(/\s+/g, '_');
};

const buildPerms = (
	rows: Array<{ modulo: string | null; permissao: string | null; ativo: boolean | null }>
) => {
	const perms: Record<string, string> = {};
	rows.forEach((registro) => {
		const modulo = String(registro.modulo || '').toLowerCase();
		if (!modulo) return;
		const permissaoNormalizada = normalizePermissao(registro.permissao);
		const finalPerm = registro.ativo ? permissaoNormalizada : 'none';
		setPerm(perms, modulo, finalPerm);
		const alias = MODULO_ALIASES[modulo];
		if (alias) setPerm(perms, alias, finalPerm);
	});
	return perms;
};

function normalizePathname(pathname: string) {
	if (pathname === '/') return '/';
	return pathname.replace(/\/+$/, '') || '/';
}

function isDashboardCanonicalRoute(pathname: string) {
	return (
		pathname === '/' ||
		pathname === '/dashboard' ||
		pathname === '/dashboard/geral' ||
		pathname === '/dashboard/vendedor' ||
		pathname === '/dashboard/gestor' ||
		pathname === '/dashboard/master'
	);
}

function buildLoginRedirectUrl(url: URL) {
	const nextPath = `${url.pathname}${url.search || ''}`;
	return `/auth/login?next=${encodeURIComponent(nextPath)}`;
}

function buildMfaSetupRedirectUrl(url: URL) {
	const nextPath = `${url.pathname}${url.search || ''}`;
	return `/perfil?setup_2fa=1&next=${encodeURIComponent(nextPath)}`;
}

function isUnsafeHttpMethod(method: string) {
	return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

const PUBLIC_AUTH_MAX_BODY_BYTES = 32 * 1024;

const CSP_REPORT_ONLY = [
	"default-src 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"frame-ancestors 'none'",
	"img-src 'self' data: blob: https:",
	"font-src 'self' data: https:",
	"style-src 'self' 'unsafe-inline' https:",
	"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
	"connect-src 'self' https: wss:",
	"frame-src https://challenges.cloudflare.com",
	"worker-src 'self' blob:",
	"form-action 'self'"
].join('; ');

type RateLimitRule = {
	prefix: string;
	limit: number;
	windowMs: number;
	methods?: string[];
};

type RateLimitBucket = {
	count: number;
	resetAt: number;
};

const PUBLIC_API_RATE_LIMITS: RateLimitRule[] = [
	{ prefix: '/api/auth/login', methods: ['POST'], limit: 8, windowMs: 60_000 },
	{ prefix: '/api/auth/passkeys/login', methods: ['POST'], limit: 12, windowMs: 60_000 },
	{ prefix: '/api/auth/set-session', methods: ['POST'], limit: 40, windowMs: 60_000 },
	{ prefix: '/api/auth/turnstile/verify', methods: ['POST'], limit: 20, windowMs: 60_000 },
	{ prefix: '/api/v1/cards', limit: 60, windowMs: 60_000 },
	{ prefix: '/api/v1/client-error', methods: ['POST'], limit: 30, windowMs: 60_000 },
	{ prefix: '/api/v1/cron/', limit: 30, windowMs: 60_000 }
];

const SYSTEM_ADMIN_BLOCKED_API_PREFIXES = [
	'/api/v1/conciliacao',
	'/api/v1/financeiro/ajustes-vendas',
	'/api/v1/parametros/escalas'
];

const rateLimitBuckets = new Map<string, RateLimitBucket>();
let lastRateLimitSweep = 0;

function resolveClientAddress(event: Parameters<Handle>[0]['event']) {
	const cloudflareIp = event.request.headers.get('cf-connecting-ip');
	if (cloudflareIp) return cloudflareIp;

	const forwardedFor = event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	if (forwardedFor) return forwardedFor;

	try {
		return event.getClientAddress();
	} catch {
		return 'unknown';
	}
}

function findPublicApiRateLimit(pathname: string, method: string) {
	const normalizedMethod = method.toUpperCase();
	return PUBLIC_API_RATE_LIMITS.find((rule) => {
		if (!pathname.startsWith(rule.prefix)) return false;
		return !rule.methods || rule.methods.includes(normalizedMethod);
	});
}

function checkPublicApiRateLimit(event: Parameters<Handle>[0]['event'], rule: RateLimitRule) {
	const now = Date.now();
	if (now - lastRateLimitSweep > 60_000) {
		for (const [key, bucket] of rateLimitBuckets.entries()) {
			if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
		}
		lastRateLimitSweep = now;
	}

	const key = `${rule.prefix}:${resolveClientAddress(event)}`;
	const bucket = rateLimitBuckets.get(key);
	if (!bucket || bucket.resetAt <= now) {
		rateLimitBuckets.set(key, { count: 1, resetAt: now + rule.windowMs });
		return null;
	}

	bucket.count += 1;
	if (bucket.count <= rule.limit) return null;
	return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
}

async function isSystemAdminApiUser(event: Parameters<Handle>[0]['event'], userId: string) {
	const { data, error } = await event.locals.supabase
		.from('users')
		.select('user_types(name)')
		.eq('id', userId)
		.maybeSingle();
	if (error) return false;
	return isSystemAdminRole(normalizeUserType(extractUserTypeName(data as any)));
}

function isRequestBodyTooLarge(event: Parameters<Handle>[0]['event'], limitBytes: number) {
	const raw = event.request.headers.get('content-length');
	if (!raw) return false;
	const length = Number(raw);
	return Number.isFinite(length) && length > limitBytes;
}

function isSameOriginMutation(event: Parameters<Handle>[0]['event']) {
	const origin = event.request.headers.get('origin');
	if (origin && origin !== event.url.origin) return false;

	const fetchSite = event.request.headers.get('sec-fetch-site');
	if (fetchSite && fetchSite.toLowerCase() === 'cross-site') return false;

	return true;
}

const supabaseHook: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient({
		get: (name) => event.cookies.get(name),
		getAll: () => event.cookies.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value })),
		set: (name, value, options) => {
			event.cookies.set(name, value, { ...options, path: '/' });
		},
		remove: (name, options) => {
			event.cookies.delete(name, { ...options, path: '/' });
		}
	});

	event.locals.safeGetSession = async () => {
		const { data: { session } } = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };
		const { data: { user }, error } = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };
		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const securityHeadersHook: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)'
	);
	response.headers.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);

	const forwardedProto = event.request.headers.get('x-forwarded-proto');
	if (event.url.protocol === 'https:' || forwardedProto === 'https') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	return response;
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { url } = event;
	const pathname = url.pathname;
	const isApiRequest = pathname.startsWith('/api/');
	const apiPublicRoutes = [
		'/api/auth/login',
		'/api/auth/passkeys/login',
		'/api/auth/set-session',
		'/api/auth/turnstile/verify',
		'/api/v1/cards',
		'/api/v1/client-error',
		'/api/v1/health',
		'/api/v1/cron/'
	];

	const rotasPublicas = [
		'/auth/login',
		'/auth/register',
		'/auth/recover',
		'/auth/recuperar-senha',
		'/auth/reset',
		'/auth/nova-senha',
		'/auth/convite',
		'/auth/update-password',
		'/manutencao',
		'/favicon',
		'/favicon.ico',
		'/icons',
		'/brand',
		'/manifest.webmanifest',
		'/manifest-calculadora.webmanifest',
		'/sw-calculadora.js',
		'/_app',
		'/assets',
		'/public',
		'/pdfs',
		'/calculadora'
	];

	const isPublic = rotasPublicas.some((r) => pathname.startsWith(r));
	if (isPublic) {
		return resolve(event);
	}

	if (isApiRequest) {
		const isApiPublic = apiPublicRoutes.some((route) => pathname.startsWith(route));
		if (isApiPublic) {
			const rateLimitRule = findPublicApiRateLimit(pathname, event.request.method);
			const retryAfter = rateLimitRule ? checkPublicApiRateLimit(event, rateLimitRule) : null;
			if (retryAfter) {
				return new Response(JSON.stringify({ error: 'Muitas tentativas. Aguarde e tente novamente.' }), {
					status: 429,
					headers: {
						'content-type': 'application/json; charset=utf-8',
						'retry-after': String(retryAfter),
						'cache-control': 'no-store'
					}
				});
			}

			if (
				pathname.startsWith('/api/auth/') &&
				isUnsafeHttpMethod(event.request.method) &&
				!isSameOriginMutation(event)
			) {
				return new Response(JSON.stringify({ error: 'Origem da requisicao invalida.' }), {
					status: 403,
					headers: { 'content-type': 'application/json; charset=utf-8' }
				});
			}
			if (
				pathname.startsWith('/api/auth/') &&
				isUnsafeHttpMethod(event.request.method) &&
				isRequestBodyTooLarge(event, PUBLIC_AUTH_MAX_BODY_BYTES)
			) {
				return new Response(JSON.stringify({ error: 'Corpo da requisicao muito grande.' }), {
					status: 413,
					headers: { 'content-type': 'application/json; charset=utf-8' }
				});
			}
			return resolve(event);
		}

		const { session, user } = await event.locals.safeGetSession();
		event.locals.session = session;
		event.locals.user = user;

		if (!session || !user) {
			return new Response(JSON.stringify({ error: 'Sessao invalida.' }), {
				status: 401,
				headers: { 'content-type': 'application/json; charset=utf-8' }
			});
		}

		const isSystemAdminBlockedApi = SYSTEM_ADMIN_BLOCKED_API_PREFIXES.some((prefix) =>
			pathname.startsWith(prefix)
		);
		if (isSystemAdminBlockedApi && (await isSystemAdminApiUser(event, user.id))) {
			return new Response(JSON.stringify({ error: 'Sem acesso.' }), {
				status: 403,
				headers: { 'content-type': 'application/json; charset=utf-8' }
			});
		}

		return resolve(event);
	}

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	if (!session || !user) {
		throw redirect(303, buildLoginRedirectUrl(url));
	}

	const supabase = event.locals.supabase;

	// Query 1: modulo_acesso + tipo de usuario em paralelo
	const [accRowsRes, userProfileRes] = await Promise.all([
		supabase
			.from('modulo_acesso')
			.select('modulo, permissao, ativo')
			.eq('usuario_id', user.id),
		// Consolida: tipo, must_change_password, perfil e company_id numa unica query
		supabase
			.from('users')
			.select('id, company_id, nome_completo, telefone, cidade, estado, uso_individual, must_change_password, user_types(name)')
			.eq('id', user.id)
			.maybeSingle()
	]);

	const acessos = buildPerms(
		(accRowsRes.data || []) as Array<{ modulo: string | null; permissao: string | null; ativo: boolean | null }>
	);

	const perfil = userProfileRes.data as any;
	const rawType = extractUserTypeName(perfil);
	const userType = normalizeUserType(rawType);
	const isSystemAdmin = isSystemAdminRole(userType);

	event.locals.userType = userType;
	event.locals.isSystemAdmin = isSystemAdmin;
	event.locals.acessos = acessos;

	// Verificar troca obrigatoria de senha
	const rotasSenhaObrigatoriaPermitidas = ['/perfil', '/auth', '/api/companies', '/api/welcome-email', '/api/users'];
	const isSenhaObrigatoriaAllowed = rotasSenhaObrigatoriaPermitidas.some((prefix) => pathname.startsWith(prefix));

	if (!isSenhaObrigatoriaAllowed) {
		const missingColumn =
			String((userProfileRes.error as any)?.code || '') === '42703' ||
			String((userProfileRes.error as any)?.message || '').toLowerCase().includes('must_change_password');

		if (!userProfileRes.error || missingColumn) {
			if (Boolean(perfil?.must_change_password)) {
				throw redirect(303, '/perfil?force_password=1');
			}
		} else {
			console.error('[hooks.server] falha ao verificar troca obrigatoria de senha', userProfileRes.error);
		}
	}

	// Bloqueio de onboarding (reutiliza perfil ja carregado)
	const rotasOnboardingPermitidas = ['/perfil', '/auth', '/api/companies', '/api/welcome-email'];
	const isOnboardingAllowed = rotasOnboardingPermitidas.some((prefix) => pathname.startsWith(prefix));

	if (!isOnboardingAllowed && perfil) {
		const precisaOnboarding =
			!perfil?.nome_completo ||
			!perfil?.telefone ||
			!perfil?.cidade ||
			!perfil?.estado ||
			perfil?.uso_individual === null ||
			perfil?.uso_individual === undefined;
		if (precisaOnboarding) {
			throw redirect(303, '/perfil/onboarding');
		}
	}

	// MFA
	const isMfaRoute = pathname.startsWith('/auth/mfa');
	const companyId = String(perfil?.company_id || '').trim() || null;
	try {
		let mfaObrigatorio = false;
		if (companyId) {
			const { data: paramData, error: paramErr } = await supabase
				.from('parametros_comissao')
				.select('mfa_obrigatorio')
				.eq('company_id', companyId)
				.maybeSingle();
			if (paramErr) throw paramErr;
			mfaObrigatorio = Boolean((paramData as any)?.mfa_obrigatorio);
		}

		const [{ data: aalData, error: aalError }, { data: factorsData, error: factorsError }] =
			await Promise.all([
				supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
				supabase.auth.mfa.listFactors()
			]);

		if (!aalError && !factorsError) {
			const hasFactor = hasVerifiedTotpFactor(factorsData || null);
			if (mfaObrigatorio && !hasFactor && !pathname.startsWith('/perfil')) {
				throw redirect(303, buildMfaSetupRedirectUrl(url));
			}
			const precisaMfa = hasFactor && aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2';
			if (precisaMfa && !isMfaRoute) {
				const nextPath = normalizeMfaRedirectPath(`${pathname}${url.search || ''}`, '/dashboard');
				throw redirect(303, `/auth/mfa?next=${encodeURIComponent(nextPath)}`);
			}
		}
	} catch (mfaError) {
		console.error('[hooks.server] falha ao verificar MFA', mfaError);
	}

	// Dashboard canonico
	const normalizedPathname = normalizePathname(pathname);
	if (isDashboardCanonicalRoute(normalizedPathname)) {
		const canonicalDashboardPath = resolveDashboardPathByUserType(userType, '/');
		if (normalizedPathname !== canonicalDashboardPath) {
			const targetUrl = new URL(canonicalDashboardPath, url);
			targetUrl.search = url.search;
			throw redirect(303, targetUrl.toString());
		}
	}

	if (isSystemAdmin) {
		const isSystemAdminAllowedRoute =
			pathname.startsWith('/admin') ||
			pathname.startsWith('/dashboard/admin') ||
			(pathname.startsWith('/perfil') && !pathname.startsWith('/perfil/escala')) ||
			pathname.startsWith('/negado') ||
			pathname.startsWith('/documentacao');

		if (!isSystemAdminAllowedRoute) {
			throw redirect(303, '/dashboard/admin');
		}

		return resolve(event);
	}

	if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard/admin')) {
		throw redirect(303, '/negado');
	}

	if (
		pathname.startsWith('/perfil') ||
		pathname.startsWith('/negado') ||
		pathname.startsWith('/documentacao') ||
		// Dashboard é acessível a qualquer usuário autenticado — sem verificação de módulo
		pathname === '/' ||
		pathname.startsWith('/dashboard')
	) {
		return resolve(event);
	}

	// Rotas master: exclusivas do papel MASTER
	// Exceção: /master/permissoes também é acessível para quem tem permissão MasterPermissoes
	// (ex: Gestores com essa permissão atribuída) — igual ao vtur-app
	if (pathname.startsWith('/master')) {
		const isMaster = isMasterRole(userType);
		if (!isMaster) {
			const isMasterPermissoesRoute =
				pathname === '/master/permissoes' || pathname.startsWith('/master/permissoes/');
			const temPermissao =
				isMasterPermissoesRoute &&
				['view', 'create', 'edit', 'delete', 'admin'].includes(
					String(acessos['master_permissoes'] || '')
				);
			if (!temPermissao) throw redirect(303, '/negado');
		}
		return resolve(event);
	}

	const modulo = descobrirModulo(pathname);
	if (!modulo) return resolve(event);

	try {
		const { data: disabledRows, error: disabledErr } = await supabase
			.from('system_module_settings')
			.select('module_key')
			.eq('enabled', false);

		if (disabledErr) {
			if (!isMissingSystemModuleSettingsTable(disabledErr)) throw disabledErr;
		} else {
			const disabledModules = (disabledRows || [])
				.map((row: any) => String(row?.module_key || ''))
				.filter(Boolean);

			if (isSystemModuleDisabled(modulo, disabledModules, false)) {
				// Módulo globalmente desabilitado — mas permissão individual ativa prevalece
				// (igual ao comportamento do store de permissões no cliente)
				const modulosConsultaDisabled = Array.from(
					new Set(
						listarModulosComHeranca(modulo).flatMap((label) => {
							const key = MAPA_MODULOS[label];
							return key ? [label, key] : [label];
						})
					)
				);
				const modulosPermitidosDisabled = new Set<string>();
				modulosConsultaDisabled.forEach((entry) => {
					const normalized = normalizeModuloKey(entry);
					if (normalized) modulosPermitidosDisabled.add(normalized);
				});

				const temPermissaoIndividual = (accRowsRes.data || []).some((row: any) => {
					if (!row?.ativo) return false;
					const moduloKey = normalizeModuloKey(row?.modulo);
					if (!moduloKey || !modulosPermitidosDisabled.has(moduloKey)) return false;
					return permLevel(row?.permissao) >= 1;
				});

				if (!temPermissaoIndividual) {
					throw redirect(303, '/negado');
				}
			}
		}
	} catch (disabledCheckErr) {
		console.error('[hooks.server] falha ao validar modulos globais', disabledCheckErr);
	}

	// Reutiliza acessos ja carregados (sem segunda query a modulo_acesso)
	const modulosConsulta = Array.from(
		new Set(
			listarModulosComHeranca(modulo).flatMap((label) => {
				const key = MAPA_MODULOS[label];
				return key ? [label, key] : [label];
			})
		)
	);

	const modulosPermitidos = new Set<string>();
	modulosConsulta.forEach((entry) => {
		const normalized = normalizeModuloKey(entry);
		if (normalized) modulosPermitidos.add(normalized);
	});

	// Filtra os acessos ja em memoria — sem nova query ao banco
	const accRowsParaModulo = (accRowsRes.data || []) as Array<{ modulo: string | null; permissao: string | null; ativo: boolean | null }>;
	const acessosValidos = accRowsParaModulo.filter((row) => {
		if (!row?.ativo) return false;
		const moduloKey = normalizeModuloKey(row?.modulo);
		return moduloKey ? modulosPermitidos.has(moduloKey) : false;
	});

	if (acessosValidos.length === 0) {
		throw redirect(303, '/negado');
	}

	const nivelOrdem = ['none', 'view', 'create', 'edit', 'delete', 'admin'];
	const melhorPermissao = acessosValidos.reduce(
		(acc, row) => {
			const perm = String(row.permissao || 'none');
			const idx = nivelOrdem.indexOf(perm as any);
			if (idx > acc.idx) return { perm, idx };
			return acc;
		},
		{ perm: 'none', idx: 0 }
	);

	if (nivelOrdem.indexOf(melhorPermissao.perm) < 1) {
		throw redirect(303, '/negado');
	}

	return resolve(event);
};

const cacheControlHook: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Apenas para paginas HTML — nao afeta assets estaticos
	const contentType = response.headers.get('content-type') || '';
	if (contentType.includes('text/html')) {
		response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
		response.headers.set('Pragma', 'no-cache');
		response.headers.set('Expires', '0');
	}

	return response;
};

export const handle = sequence(supabaseHook, securityHeadersHook, authGuard, cacheControlHook);
