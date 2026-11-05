// Servidor estático mínimo para o build SPA (sem dependências).
// Sobe com `node deploy/serve.mjs`, porta via env PORT (padrão 3001).
// Rotas que não casam com arquivo existente caem no index.html
// (roteamento client-side do TanStack Router).

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve('dist');
const assetsDir = join(root, 'assets');
const port = Number(process.env.PORT ?? 3001);

// Proxy same-origin de /api/* para os slots do backend (rede Docker
// compartilhada). Tenta os upstreams em ordem em caso de falha de conexão —
// durante um deploy blue-green sempre há um slot saudável.
const upstreams = (
	process.env.API_UPSTREAMS ??
	'http://api-blue:3000,http://api-green:3000'
)
	.split(',')
	.map((u) => new URL(u.trim()));

const MAX_BODY = 2 * 1024 * 1024;

function sendToUpstream(req, res, body, index) {
	const target = upstreams[index];
	if (!target) {
		res.writeHead(502, { 'Content-Type': 'application/json' });
		res.end('{"success":false,"error":{"code":"API_UNAVAILABLE","message":"API indisponível"}}');
		return;
	}
	const upstream = request(
		{
			hostname: target.hostname,
			port: target.port,
			path: req.url,
			method: req.method,
			headers: {
				...req.headers,
				host: target.host,
				'content-length': body.length,
			},
			timeout: 15000,
		},
		(reply) => {
			res.writeHead(reply.statusCode ?? 502, reply.headers);
			reply.pipe(res);
		},
	);
	upstream.on('timeout', () => upstream.destroy(new Error('timeout')));
	upstream.on('error', () => sendToUpstream(req, res, body, index + 1));
	upstream.end(body);
}

function proxyApi(req, res) {
	// O corpo é lido antes de proxiar: assim uma tentativa de retry para o
	// outro slot envia o payload inteiro, nunca um stream meio consumido.
	const chunks = [];
	let size = 0;
	req.on('data', (chunk) => {
		size += chunk.length;
		if (size > MAX_BODY) {
			res.writeHead(413).end();
			req.destroy();
			return;
		}
		chunks.push(chunk);
	});
	req.on('end', () => sendToUpstream(req, res, Buffer.concat(chunks), 0));
	req.on('error', () => res.destroy());
}

const types = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json',
	'.map': 'application/json',
	'.mjs': 'text/javascript; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.ttf': 'font/ttf',
	'.txt': 'text/plain; charset=utf-8',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

createServer((req, res) => {
	const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);

	if (pathname === '/api' || pathname.startsWith('/api/')) {
		proxyApi(req, res);
		return;
	}

	let file = normalize(join(root, pathname));

	if (file !== root && !file.startsWith(root + sep)) {
		res.writeHead(403).end();
		return;
	}
	if (!existsSync(file) || statSync(file).isDirectory()) {
		file = join(root, 'index.html');
	}

	const headers = { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' };
	if (file.startsWith(assetsDir + sep)) {
		headers['Cache-Control'] = 'public, max-age=31536000, immutable';
	} else if (file.endsWith('index.html')) {
		headers['Cache-Control'] = 'no-cache';
	}

	res.writeHead(200, headers);
	createReadStream(file).pipe(res);
}).listen(port, () => {
	console.log(`SPA servindo ${root} na porta ${port}`);
});
