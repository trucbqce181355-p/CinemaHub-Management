import PricingRuleEditor from '../../components/PricingRuleEditor';
import PromotionEditor from '../../components/PromotionEditor';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { Edit2, EyeOff, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const blankPromo = () => ({ code:'', title:'', description:'', discountType:'Percentage', discountValue:'', startDate:'', endDate:'', status:'Active', bannerImage:'', conditions:{}, version:null });
const blankRule = () => ({ triggerVariable:'WEEKEND', adjustmentValue:'', status:'Active', conditionParams:{}, version:null });
const labels = { WEEKEND:'Cuối tuần', HOLIDAY:'Ngày lễ', LATE_NIGHT:'Giờ vàng', SNEAK_SHOW:'Suất chiếu sớm' };
const legacy = { 'Cuối tuần':'WEEKEND', 'Ngày Lễ':'HOLIDAY', 'Giờ vàng':'LATE_NIGHT', 'Suất chiếu sớm':'SNEAK_SHOW' };
const number = value => Number(value || 0).toLocaleString('vi-VN');
const ruleConditions = rule => {
  const trigger=legacy[rule.triggerVariable]||rule.triggerVariable, c=rule.conditionParams||{};
  if(trigger==='WEEKEND')return 'Thứ Bảy và Chủ nhật';
  if(trigger==='LATE_NIGHT')return 'Từ '+String(c.startHour??22).padStart(2,'0')+':00';
  if(trigger==='HOLIDAY')return Array.isArray(c.dates)?c.dates.map(d=>new Date(d+'T00:00:00').toLocaleDateString('vi-VN')).join(', '):'Chưa cấu hình ngày lễ';
  if(trigger==='SNEAK_SHOW')return 'Áp dụng cho '+(Array.isArray(c.showtimeIds)?c.showtimeIds.length:0)+' suất chiếu';
  return 'Cần cập nhật điều kiện';
};
export default function PromotionManagement() {
  const { user } = useAuth();
  const allowed = ['Manager','Admin'].includes(user?.role);
  const [params,setParams] = useSearchParams();
  const tab = params.get('tab') === 'pricing' ? 'pricing' : 'promotions';
  const [promotions,setPromotions] = useState([]), [rules,setRules] = useState([]);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [editing,setEditing] = useState(null), [form,setForm] = useState(null), [formError,setFormError] = useState('');
  const action = useRef(false), generation = useRef(0);
  async function request(url, options = {}) {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const res=await fetch(API+url,{...options,signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+user?.token}});
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||(res.status===403?'Bạn không có quyền thực hiện thao tác này.':'Không thể hoàn thành yêu cầu.'));
      return data;
    }catch(e){if(controller.signal.aborted)throw new Error('Hết thời gian chờ. Hãy tải lại danh sách để kiểm tra kết quả trước khi thao tác lại.');throw e;}finally{clearTimeout(timeout);}
  }
  async function load() {
    const current = ++generation.current; setLoading(true); setError('');
    try {
      const [p,r] = await Promise.all([request('/promotions'), request('/pricing-rules')]);
      if (!Array.isArray(p) || !Array.isArray(r)) throw new Error('Dữ liệu danh sách không hợp lệ');
      if (current===generation.current) { setPromotions(p); setRules(r); }
    } catch(e) { if(current===generation.current) setError(e.message); }
    finally { if(current===generation.current) setLoading(false); }
  }
  useEffect(()=> { if(allowed) load(); return ()=>{generation.current++;}; }, [user?.token, allowed]);
  if (!allowed) return <Navigate to="/" replace />;
  function open(item) {
    setEditing(item?.id || null); setFormError(''); setNotice('');
    if(tab==='promotions') setForm(item ? {...item, conditions:{...item.conditions}, discountType:item.discountType?.toUpperCase()==='PERCENTAGE'?'Percentage':'Fixed', startDate:item.startDate?.slice(0,16)||'', endDate:item.endDate?.slice(0,16)||''} : blankPromo());
    else {
      const r = item ? {...item, triggerVariable:legacy[item.triggerVariable]||item.triggerVariable, conditionParams:{...item.conditionParams}} : blankRule();
      setForm(r);
    }
  }
  async function persist(payload, resource) {
    if(action.current)return; action.current=true;setBusy(true);setFormError('');
    try {await request(resource+(editing?'/'+editing:''),{method:editing?'PUT':'POST',body:JSON.stringify(payload)});setForm(null);setNotice('Đã lưu thành công.');await load();}
    catch(e){setFormError(e.message);}finally{action.current=false;setBusy(false);}
  }
  async function savePromotion(payload) { await persist(payload,'/promotions'); }
  async function savePricing(payload) { await persist(payload,'/pricing-rules'); }
  async function disable(item) {
    if(action.current || !window.confirm('Vô hiệu hóa chương trình này? Dữ liệu lịch sử sẽ được giữ lại.'))return;
    action.current=true;setBusy(true);setError('');setNotice('');
    try {await request((tab==='promotions'?'/promotions/':'/pricing-rules/')+item.id+(item.version==null?'':'?version='+item.version),{method:'DELETE'});setNotice('Đã vô hiệu hóa thành công.');await load();}
    catch(e){setError(e.message);}finally{action.current=false;setBusy(false);}
  }
  async function archive(item) {
    const promotion=tab==='promotions', name=promotion?'mã '+item.code:'luật giá '+(labels[legacy[item.triggerVariable]||item.triggerVariable]||item.triggerVariable);
    if(action.current || !window.confirm('Xóa mềm '+name+' khỏi danh sách? Dữ liệu lịch sử vẫn được giữ lại.'))return;
    action.current=true;setBusy(true);setError('');setNotice('');
    try {
      await request((promotion?'/promotions/':'/pricing-rules/')+item.id+'/archive'+(item.version==null?'':'?version='+item.version),{method:'DELETE'});
      setNotice(promotion?'Đã xóa mềm mã khuyến mãi khỏi danh sách.':'Đã xóa mềm luật giá khỏi danh sách.');await load();
    }catch(e){setError(e.message);}finally{action.current=false;setBusy(false);}
  }
  return <div className="space-y-6 text-white">
    <div className="flex justify-between gap-4"><h1 className="text-2xl font-bold">Khuyến mãi & Giá động</h1><button disabled={busy||loading} onClick={()=>open(null)} className="bg-primary px-5 py-2 rounded-lg disabled:opacity-50">Thêm mới</button></div>
    <div className="flex gap-4">{['promotions','pricing'].map(t=><button key={t} disabled={busy||!!form} onClick={()=>setParams({tab:t})} className={'px-4 py-2 rounded-lg '+(tab===t?'bg-primary':'bg-white/10')}>{t==='promotions'?'Khuyến mãi':'Giá động'}</button>)}</div>
    {error && <p role="alert" className="text-red-400">{error}</p>}{notice && <p role="status" className="text-green-400">{notice}</p>}
    {tab==='pricing' && <p className="text-gray-400 text-sm">Các luật phù hợp được cộng theo giờ suất chiếu. Giá mỗi ghế sau phụ thu và điều chỉnh nằm trong 1.000–2.000.000đ. Giá đã giữ được giữ nguyên trong thời hạn đặt vé.</p>}
    {loading?<p role="status">Đang tải…</p>:!error && <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-left"><thead className="bg-white/5"><tr><th className="p-4">{tab==='promotions'?'Mã / Tiêu đề':'Sự kiện'}</th><th>Giá trị</th><th>Hiệu lực / Điều kiện</th><th>Trạng thái</th><th className="p-4 text-center">Thao tác</th></tr></thead><tbody>
      {(tab==='promotions'?promotions:rules).map(item=><tr key={item.id} className="border-t border-white/10"><td className="p-4">{tab==='promotions'?<><strong>{item.code}</strong><div>{item.title}</div></>:labels[legacy[item.triggerVariable]||item.triggerVariable]||item.triggerVariable}</td>
        <td>{tab==='promotions'?(item.discountType?.toUpperCase()==='PERCENTAGE'?number(item.discountValue)+'%':number(item.discountValue)+'đ'):number(item.adjustmentValue)+'đ'}</td>
        <td className="text-sm">{tab==='promotions'?<>{item.startDate?.replace('T',' ')}<br/>{item.endDate?.replace('T',' ')}{item.conditions?.minSpend!=null&&<div>Tối thiểu: {number(item.conditions.minSpend)}đ</div>}</>:ruleConditions(item)}</td>
        <td>{item.status==='Active' && tab==='promotions' && new Date(item.endDate)<=new Date()?'Hết hạn':item.status}</td>
        <td className="p-4">
          <div className="flex items-center justify-center gap-2">
            <button type="button" disabled={busy} onClick={()=>open(item)}
              title="Chỉnh sửa thông tin" aria-label={'Sửa '+(item.code||item.triggerVariable)}
              className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Edit2 className="w-4 h-4" aria-hidden="true" />
            </button>
            {item.status==='Active'&&<button type="button" disabled={busy} onClick={()=>disable(item)}
              title="Vô hiệu hóa" aria-label={'Vô hiệu hóa '+(item.code||item.triggerVariable)}
              className="p-2 text-orange-400 hover:bg-orange-400/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            </button>}
            {item.status==='Disabled' && <button type="button" disabled={busy} onClick={()=>archive(item)}
              title="Xóa mềm khỏi danh sách" aria-label={'Xóa mềm '+(item.code||labels[legacy[item.triggerVariable]||item.triggerVariable]||item.triggerVariable)}
              className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>}
          </div>
        </td></tr>)}
      {(tab==='promotions'?promotions:rules).length===0&&<tr><td colSpan="5" className="p-8 text-center">Chưa có dữ liệu.</td></tr>}
    </tbody></table></div>}
    {form && tab==='pricing' && <PricingRuleEditor initialValue={form} editing={!!editing} busy={busy} error={formError} onSave={savePricing} onClose={()=>setForm(null)} />}
    {form && tab==='promotions' && <PromotionEditor initialValue={form} editing={!!editing} busy={busy} error={formError} onSave={savePromotion} onClose={()=>setForm(null)} />}
  </div>;
}
