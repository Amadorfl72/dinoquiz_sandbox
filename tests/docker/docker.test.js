'use strict';

/**
 * Automated conventions check for the Docker build/startup config (see
 * Dockerfile, docker-compose.yml, .dockerignore, docker/nginx.conf). Asserts
 * the container setup stays correct via `npm test` without needing a live
 * Docker daemon in CI.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Docker build/startup config', () => {
  test('required Docker files exist', () => {
    for (const rel of ['Dockerfile', 'docker-compose.yml', '.dockerignore', 'docker/nginx.conf']) {
      expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
    }
  });

  test('Dockerfile copies the public/ web root', () => {
    const dockerfile = read('Dockerfile');
    expect(dockerfile).toMatch(/COPY\s+public\//);
  });

  test('Dockerfile copies the nginx config', () => {
    const dockerfile = read('Dockerfile');
    expect(dockerfile).toMatch(/COPY\s+docker\/nginx\.conf/);
  });

  test('Dockerfile does not embed secrets or env files', () => {
    const dockerfile = read('Dockerfile');
    expect(dockerfile).not.toMatch(/COPY\s+\.env/);
    expect(dockerfile).not.toMatch(/\bENV\s+\S*(SECRET|TOKEN|PASSWORD|API_KEY)/i);
    expect(dockerfile.toLowerCase()).not.toMatch(/secret/);
  });

  test('docker-compose.yml declares the documented port mapping', () => {
    const compose = read('docker-compose.yml');
    expect(compose).toMatch(/"8080:80"/);
  });

  test('docker-compose.yml declares a healthcheck', () => {
    const compose = read('docker-compose.yml');
    expect(compose).toMatch(/healthcheck:/);
    expect(compose).toMatch(/test:\s*\[.*CMD/);
  });

  test('.dockerignore excludes test/dev artifacts from the build context', () => {
    const lines = read('.dockerignore').split('\n').map((line) => line.trim());
    for (const entry of ['node_modules', 'tests', '.git']) {
      expect(lines).toContain(entry);
    }
  });

  test('docker/nginx.conf serves the app root and listens on port 80', () => {
    const nginxConf = read('docker/nginx.conf');
    expect(nginxConf).toMatch(/listen\s+80;/);
    expect(nginxConf).toMatch(/root\s+\/usr\/share\/nginx\/html;/);
  });
});
