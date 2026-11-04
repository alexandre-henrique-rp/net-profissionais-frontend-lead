// Servidor estático mínimo para o build SPA (sem dependências).
// Sobe com `node deploy/serve.mjs`, porta via env PORT (padrão 3001).
// Rotas que não casam com arquivo existente caem no index.html
// (roteamento client-side do TanStack Router).

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve('dist');
const assetsDir = join(root, 'assets');
const port = Number(process.env.PORT ?? 3001);

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
