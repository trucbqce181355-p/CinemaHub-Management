const fs = require('fs');
const file = 'd:/huy/CinemaHub-Management/CinemaHub/frontend/src/pages/admin/MovieManagement.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update initialFormState
content = content.replace(/actors: ''\s*\};/, 'actors: \'\',\n      standardPrice: 90000,\n      vipPrice: 120000,\n      couplePrice: 200000\n    };');

// 2. Update payload in handleAddMovie and handleEditMovie
content = content.replace(/duration: Number\(formData\.duration\),/g, 'duration: Number(formData.duration),\n          standardPrice: Number(formData.standardPrice),\n          vipPrice: Number(formData.vipPrice),\n          couplePrice: Number(formData.couplePrice),');

// 3. Add the form UI
const uiToAdd = `                  {/* Row 4: Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Giá Vé Thường (VNĐ)</label>
                      <input
                        type="number"
                        name="standardPrice"
                        min="0"
                        value={formData.standardPrice}
                        onChange={handleInputChange}
                        className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Giá Vé VIP (VNĐ)</label>
                      <input
                        type="number"
                        name="vipPrice"
                        min="0"
                        value={formData.vipPrice}
                        onChange={handleInputChange}
                        className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Giá Vé Couple (VNĐ)</label>
                      <input
                        type="number"
                        name="couplePrice"
                        min="0"
                        value={formData.couplePrice}
                        onChange={handleInputChange}
                        className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>

                  {/* Row 5: Description */}
                  <div className="space-y-2">`;
content = content.replace(/\{\/\* Row 4: Description \*\/\}\s*<div className="space-y-2">/, uiToAdd);

fs.writeFileSync(file, content);
console.log('Done patching MovieManagement.jsx');
