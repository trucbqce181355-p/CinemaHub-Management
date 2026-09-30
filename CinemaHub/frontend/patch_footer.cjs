const fs = require('fs');
const file = 'd:/huy/CinemaHub-Management/CinemaHub/frontend/src/components/Footer.jsx';
let content = fs.readFileSync(file, 'utf8');

const linksBlockOld = `          <div>
            <h4 className="text-white font-medium mb-4">Khám phá</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-primary transition-colors">Phim đang chiếu</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Phim sắp chiếu</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Cụm rạp</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">Khuyến mãi</Link></li>
            </ul>
          </div>`;

const linksBlockNew = `          <div>
            <h4 className="text-white font-medium mb-4">Khám phá</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/#phim-dang-chieu" className="hover:text-primary transition-colors">Phim đang chiếu</a></li>
              <li><a href="/#phim-sap-chieu" className="hover:text-primary transition-colors">Phim sắp chiếu</a></li>
              <li><Link to="/cinemas" className="hover:text-primary transition-colors">Rạp phim</Link></li>
              <li><Link to="/promotions" className="hover:text-primary transition-colors">Khuyến mãi</Link></li>
            </ul>
          </div>`;

content = content.replace(linksBlockOld, linksBlockNew);

fs.writeFileSync(file, content);
console.log('Updated Footer links');
