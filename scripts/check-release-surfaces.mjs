import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
const pkg = await readJson('package.json');
const lock = await readJson('package-lock.json');
const manifest = await readJson('mcpb/manifest.json');
const server = await readJson('server.json');
const version = pkg.version;

assert.equal(lock.version, version, 'package-lock root version must match package.json');
assert.equal(lock.packages[''].version, version, 'lockfile package entry must match package.json');
assert.equal(manifest.version, version, 'MCPB manifest must match package.json');
assert.equal(server.version, version, 'server.json must match package.json');
assert.match(server.packages[0].identifier, new RegExp(`/v${version}/pcp-engine-v${version}\\.mcpb$`));
assert.match(server.packages[0].fileSha256, /^[a-f0-9]{64}$/);
assert.equal(pkg.scripts.prepare, undefined, 'GitHub source installs must not compile during npm prepare');
await access(new URL('../dist/src/api.js', import.meta.url));

const [readme, changelog, actionYaml] = await Promise.all([
  readFile(new URL('../README.md', import.meta.url), 'utf8'),
  readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8'),
  readFile(new URL('../action.yml', import.meta.url), 'utf8'),
]);
assert.match(readme, new RegExp(`#v${version}\\b`), 'README install must use the current GitHub release');
assert.match(readme, new RegExp(`@v${version}\\b`), 'README Action example must use the current release');
assert.match(changelog, new RegExp(`^## \\[${version}\\]`, 'm'), 'changelog must lead with the current version');

assert.ok(readme.includes('governs prompts before they reach a model'), 'README must lead with governance before inference');
assert.ok(readme.includes('pcp optimize --file prompts/review-auth.md'), 'README must show the full optimize pipeline');
assert.ok(readme.includes('pass/fail gate across prompt files'), 'README must distinguish the CI threshold gate');
assert.ok(readme.includes('does not evaluate model outputs'), 'README must define PCP scope accurately');
assert.ok(readme.includes('subcommand: optimize'), 'README Action example must lead with optimize');

const actionDescription = actionYaml.match(/^description:\s*'([^']*)'/m)?.[1]?.trim();
assert.ok(actionDescription, 'action.yml must have a single quoted description');
assert.ok(actionDescription.length <= 125, 'Marketplace Action description must fit GitHub’s 125-character limit');

const registryUrl = 'https://registry.modelcontextprotocol.io/v0.1/servers/io.github.rishi-banerjee1%2Fpcp-engine/versions/latest';
const registryResponse = await fetch(registryUrl);
assert.ok(registryResponse.ok, `official MCP Registry returned ${registryResponse.status}`);
const registryPayload = await registryResponse.json();
assert.equal(registryPayload._meta['io.modelcontextprotocol.registry/official'].status, 'active');
const registryVersion = registryPayload.server.version;
const registryIsCurrent = registryVersion === version;
if (registryIsCurrent) {
  assert.equal(registryPayload.server.packages[0].identifier, server.packages[0].identifier, 'registry package URL must match server.json');
  assert.equal(registryPayload.server.packages[0].fileSha256, server.packages[0].fileSha256, 'registry checksum must match server.json');
} else {
  const [registryMajor, registryMinor, registryPatch] = registryVersion.split('.').map(Number);
  const [currentMajor, currentMinor, currentPatch] = version.split('.').map(Number);
  assert.ok(
    registryMajor < currentMajor ||
      (registryMajor === currentMajor && registryMinor < currentMinor) ||
      (registryMajor === currentMajor && registryMinor === currentMinor && registryPatch < currentPatch),
    `official MCP Registry latest (${registryVersion}) is newer than source (${version})`,
  );
}

const marketplaceResponse = await fetch('https://github.com/marketplace/actions/prompt-control-plane');
assert.ok(marketplaceResponse.ok, `GitHub Marketplace returned ${marketplaceResponse.status}`);
const marketplaceHtml = await marketplaceResponse.text();
const embedded = marketplaceHtml.match(/data-target="react-app\.embeddedData">(.*?)<\/script>/s)?.[1];
assert.ok(embedded, 'Marketplace metadata payload is missing');
const marketplace = JSON.parse(embedded).payload;
assert.equal(marketplace.action.description.trim(), actionDescription, 'Marketplace description must match action.yml');
assert.ok(marketplace.readmeHtml.includes('subcommand: optimize'), 'Marketplace README must position optimize as the primary Action command');
if (registryIsCurrent) {
  assert.ok(marketplace.readmeHtml.includes(`@v${version}`), 'Marketplace README must show the current Action version');
  assert.ok(marketplace.readmeHtml.includes(`#v${version}`), 'Marketplace README must show the current source install');
}
assert.ok(!marketplace.readmeHtml.includes('maintained privately'), 'Marketplace README must not disclose private maintenance');
assert.ok(!pkg.scripts.prepare, 'Git source install must not require an install-time build');
await access(new URL('../dist/src/api.js', import.meta.url));

console.log(`Release surfaces match v${version}; MCP Registry ${registryVersion} and Marketplace checked.`);
