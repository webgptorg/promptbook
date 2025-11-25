const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.join('apps', 'agents-server', 'public', 'fonts');
const filePath = path.join(dir, 'OpenMoji-black-glyf.woff2');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const file = fs.createWriteStream(filePath);
https.get('https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/font/OpenMoji-black-glyf/OpenMoji-black-glyf.woff2', function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close();
    console.log('Download completed');
  });
}).on('error', function(err) { 
  fs.unlink(filePath); 
  console.error('Error downloading file:', err.message);
});
