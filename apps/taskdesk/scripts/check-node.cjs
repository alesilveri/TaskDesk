const major = Number(process.versions.node.split('.')[0]);
const allowed = major === 20 || major === 22;

if (!allowed) {
  console.error('');
  console.error('TaskDesk richiede Node.js LTS 20 o 22.');
  console.error('Node 24 non e supportato.');
  console.error(`Versione rilevata: ${process.versions.node}`);
  console.error('Usa nvm o volta per passare a Node 22 LTS e riprova.');
  process.exit(1);
}
