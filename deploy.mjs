import FtpDeploy from 'ftp-deploy';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ftpDeploy = new FtpDeploy();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Funkcia na získanie vstupu od používateľa
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function deploy() {
  console.log('== FTP Nasadenie aplikácie ==');
  console.log('Zadajte informácie pre pripojenie na FTP server:');
  
  const host = await question('FTP server (napr. renemoravec.sk): ');
  const user = await question('Login: ');
  const password = await question('Heslo: ');
  const port = await question('Port (21 pre FTP, 22 pre SFTP): ');
  const remotePath = await question('Vzdialený adresár (napr. /www/ alebo /): ');
  
  const config = {
    user: user,
    password: password,
    host: host,
    port: port,
    localRoot: __dirname + '/dist',
    remoteRoot: remotePath,
    include: ['*', '**/*'],      // súbory na nahratie
    exclude: ['**/*.map'],       // súbory, ktoré sa nebudú nahrávať
    deleteRemote: false,         // nezmazať súbory na serveri
    forcePasv: true              // použiť PASV mód
  };

  try {
    console.log('Začínam nahrávať súbory na server...');
    await ftpDeploy.deploy(config);
    console.log('✅ Nasadenie bolo úspešne dokončené!');
  } catch (error) {
    console.error('❌ Chyba pri nasadení:', error);
  }
  
  rl.close();
}

deploy(); 