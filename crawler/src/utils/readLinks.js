const fs = require('fs');

function readLinks(path = './data/links.txt') {
  return fs.readFileSync(path, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

module.exports = { readLinks };
