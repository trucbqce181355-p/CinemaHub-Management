const fs = require('fs');
const file = 'd:/huy/CinemaHub-Management/CinemaHub/frontend/src/pages/admin/ScreenRoomManagement.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add LayoutGrid icon
content = content.replace(/import \{ Monitor, Plus, Edit, Trash2, ArrowLeft, X, XOctagon \} from 'lucide-react';/, "import { Monitor, Plus, Edit, Trash2, ArrowLeft, X, XOctagon, LayoutGrid } from 'lucide-react';\nimport SeatManagementModal from './SeatManagementModal';");

// 2. Add state for seat modal
content = content.replace(/const \[loading, setLoading\] = useState\(true\);/, "const [loading, setLoading] = useState(true);\n  const [seatModalRoom, setSeatModalRoom] = useState(null);");

// 3. Add button in the table
const btnReplacement = `                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSeatModalRoom(r)} className="p-2 text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors" title="Sơ đồ ghế"><LayoutGrid className="w-4 h-4" /></button>
                        <button onClick={() => handleEdit(r)}`;
content = content.replace(/<div className="flex justify-end gap-2">\s*<button onClick=\{\(\) => handleEdit\(r\)\}/, btnReplacement);

// 4. Render modal at the bottom
const modalReplacement = `      {seatModalRoom && (
        <SeatManagementModal room={seatModalRoom} onClose={() => setSeatModalRoom(null)} />
      )}
    </div>
  );
};
export default ScreenRoomManagement;`;
content = content.replace(/    <\/div>\s*\);\s*};\s*export default ScreenRoomManagement;/, modalReplacement);

fs.writeFileSync(file, content);
console.log('Done patching ScreenRoomManagement.jsx');
