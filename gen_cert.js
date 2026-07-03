const selfsigned = require('selfsigned');
const fs = require('fs');

async function gen() {
    const pems = await selfsigned.generate([{ name: 'commonName', value: '14.224.194.242' }], { days: 365, keySize: 2048 });
    fs.writeFileSync('cert.pem', pems.cert);
    fs.writeFileSync('key.pem', pems.private);
    console.log('Certificates generated');
}
gen();
