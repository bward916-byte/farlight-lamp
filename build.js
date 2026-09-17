const fs = require('fs');
const js = ['game.js', 'render.js', 'main.js'].map(f => fs.readFileSync(__dirname + '/src/' + f, 'utf8')).join('\n');
const html = fs.readFileSync(__dirname + '/src/template.html', 'utf8').replace('/*GAME*/', () => js);
fs.writeFileSync(__dirname + '/index.html', html);
console.log('built index.html', html.length, 'bytes,', html.split('\n').length, 'lines');
