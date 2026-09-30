const fs = require('fs');
const file = 'd:/huy/CinemaHub-Management/CinemaHub/frontend/src/pages/Booking.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove combos state
content = content.replace(/\/\/ CGV F&B Concession Combos \(Bắp Nước CGV\)[\s\S]*?const updateComboQty = \(id, delta\) => \{[\s\S]*?\}\);\n  \};\n/g, '');

// 2. Remove Combo UI
content = content.replace(/\{\/\* 3\.2 Combo Bắp Nước CGV[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '{/* Combo Bắp Nước CGV removed */}');

// 3. Remove comboTotal from pricing logic
content = content.replace(/\{comboTotal > 0 && \([\s\S]*?\}\)/, '');
content = content.replace(/\{\(pricing\.total \+ comboTotal\)\.toLocaleString\(\)\}/g, '{pricing.total.toLocaleString()}');
content = content.replace(/totalAmount: pricing\.total \+ comboTotal/g, 'totalAmount: pricing.total');

fs.writeFileSync(file, content);
console.log('Done removing Combo UI');
