const fs = require('fs');
const file = 'd:/huy/CinemaHub-Management/CinemaHub/frontend/src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<section className="py-16 bg-background relative overflow-hidden">/, '<section id="phim-dang-chieu" className="py-16 bg-background relative overflow-hidden">');
content = content.replace(/<section className="py-16 bg-\[#121212\] relative overflow-hidden border-t border-white\/5">/, '<section id="phim-sap-chieu" className="py-16 bg-[#121212] relative overflow-hidden border-t border-white/5">');

fs.writeFileSync(file, content);
console.log('Added IDs to Home sections');
