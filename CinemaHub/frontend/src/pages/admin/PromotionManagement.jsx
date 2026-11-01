import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const blankPromo = () => ({ code:'', title:'', description:'', discountType:'Percentage', discountValue:'', startDate:'', endDate:'', status:'Active', bannerImage:'', conditions:{}, version:null });
const blankRule = () => ({ triggerVariable:'WEEKEND', adjustmentValue:'', status:'Active', conditionParams:{}, version:null });
const labels = { WEEKEND:'Cuối tuần', HOLIDAY:'Ngày lễ', LATE_NIGHT:'Giờ vàng', SNEAK_SHOW:'Suất chiếu sớm' };
const legacy = { 'Cuối tuần':'WEEKEND', 'Ngày Lễ':'HOLIDAY', 'Giờ vàng':'LATE_NIGHT', 'Suất chiếu sớm':'SNEAK_SHOW' };
const number = value => Number(value || 0).toLocaleString('vi-VN');
export default function PromotionManagement() {
  const { user } = useAuth();
  const allowed = ['Manager','Admin'].includes(user?.role);
  const [params,setParams] = useSearchParams();
  const tab = params.get('tab') === 'pricing' ? 'pricing' : 'promotions';
  const [promotions,setPromotions] = useState([]), [rules,setRules] = useState([]);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [editing,setEditing] = useState(null), [form,setForm] = useState(null), [formError,setFormError] = useState('');
  const [listText,setListText] = useState('');
  const action = useRef(false), generation = useRef(0);
  const field = 'w-full rounded-lg bg-white/5 border border-white/20 p-3 text-white';
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
      setForm(r); setListText((r.conditionParams.dates || r.conditionParams.showtimeIds || []).join(', '));
    }
  }
  async function save(e) {
    e.preventDefault(); if(action.current) return;
    let payload = {...form}; setFormError('');
    if(tab==='promotions') {
      if(new Date(form.endDate)<=new Date(form.startDate)) {setFormError('Ngày kết thúc phải sau ngày bắt đầu.');return;}
      if(form.discountType==='Percentage' && Number(form.discountValue)>100) {setFormError('Phần trăm giảm giá tối đa là 100%.');return;}
      payload.code = form.code.trim().toUpperCase(); payload.discountValue=Number(form.discountValue);
    } else {
      payload.adjustmentValue=Number(form.adjustmentValue);
      payload.conditionParams = form.triggerVariable==='HOLIDAY' ? {dates:listText.split(',').map(s=>s.trim()).filter(Boolean)}
        : form.triggerVariable==='SNEAK_SHOW' ? {showtimeIds:listText.split(',').map(s=>s.trim()).filter(Boolean)}
        : form.triggerVariable==='LATE_NIGHT' ? {startHour:Number(form.conditionParams.startHour ?? 22)} : {};
    }
    action.current=true;setBusy(true);
    try {await request((tab==='promotions'?'/promotions':'/pricing-rules')+(editing?'/'+editing:''),{method:editing?'PUT':'POST',body:JSON.stringify(payload)});setForm(null);setNotice('Đã lưu thành công.');await load();}
    catch(e){setFormError(e.message);}finally{action.current=false;setBusy(false);}
  }
  async function disable(item) {
    if(action.current || !window.confirm('Vô hiệu hóa chương trình này? Dữ liệu lịch sử sẽ được giữ lại.'))return;
    action.current=true;setBusy(true);setError('');setNotice('');
    try {await request((tab==='promotions'?'/promotions/':'/pricing-rules/')+item.id+(item.version==null?'':'?version='+item.version),{method:'DELETE'});setNotice('Đã vô hiệu hóa thành công.');await load();}
    catch(e){setError(e.message);}finally{action.current=false;setBusy(false);}
  }
  function condition(key,value) {const c={...form.conditions};if(value==='')delete c[key];else c[key]=Number(value);setForm({...form,conditions:c});}
  return <div className="space-y-6 text-white">
    <div className="flex justify-between gap-4"><h1 className="text-2xl font-bold">Khuyến mãi & Giá động</h1><button disabled={busy||loading} onClick={()=>open(null)} className="bg-primary px-5 py-2 rounded-lg disabled:opacity-50">Thêm mới</button></div>
    <div className="flex gap-4">{['promotions','pricing'].map(t=><button key={t} disabled={busy||!!form} onClick={()=>setParams({tab:t})} className={'px-4 py-2 rounded-lg '+(tab===t?'bg-primary':'bg-white/10')}>{t==='promotions'?'Khuyến mãi':'Giá động'}</button>)}<button disabled={busy} onClick={load}>Tải lại</button></div>
    {error && <p role="alert" className="text-red-400">{error}</p>}{notice && <p role="status" className="text-green-400">{notice}</p>}
    {tab==='pricing' && <p className="text-gray-400 text-sm">Các luật phù hợp được cộng theo giờ suất chiếu. Giá mỗi ghế sau phụ thu và điều chỉnh nằm trong 1.000–2.000.000đ. Giá đã giữ được giữ nguyên trong thời hạn đặt vé.</p>}
    {loading?<p role="status">Đang tải…</p>:!error && <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-left"><thead className="bg-white/5"><tr><th className="p-4">{tab==='promotions'?'Mã / Tiêu đề':'Sự kiện'}</th><th>Giá trị</th><th>Hiệu lực / Điều kiện</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
      {(tab==='promotions'?promotions:rules).map(item=><tr key={item.id} className="border-t border-white/10"><td className="p-4">{tab==='promotions'?<><strong>{item.code}</strong><div>{item.title}</div></>:labels[legacy[item.triggerVariable]||item.triggerVariable]||item.triggerVariable}</td>
        <td>{tab==='promotions'?(item.discountType?.toUpperCase()==='PERCENTAGE'?number(item.discountValue)+'%':number(item.discountValue)+'đ'):number(item.adjustmentValue)+'đ'}</td>
        <td className="text-sm">{tab==='promotions'?<>{item.startDate?.replace('T',' ')}<br/>{item.endDate?.replace('T',' ')}{item.conditions?.minSpend!=null&&<div>Tối thiểu: {number(item.conditions.minSpend)}đ</div>}</>:JSON.stringify(item.conditionParams||{})}</td>
        <td>{item.status==='Active' && tab==='promotions' && new Date(item.endDate)<=new Date()?'Hết hạn':item.status}</td>
        <td><button disabled={busy} onClick={()=>open(item)} className="p-3 text-blue-300">Sửa</button>{item.status==='Active'&&<button disabled={busy} onClick={()=>disable(item)} className="p-3 text-red-400">Vô hiệu hóa</button>}</td></tr>)}
      {(tab==='promotions'?promotions:rules).length===0&&<tr><td colSpan="5" className="p-8 text-center">Chưa có dữ liệu.</td></tr>}
    </tbody></table></div>}
    {form && <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-labelledby="program-title" className="bg-[#141414] border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <h2 id="program-title" className="text-xl font-bold mb-4">{editing?'Chỉnh sửa':'Tạo mới'} {tab==='promotions'?'khuyến mãi':'luật giá'}</h2>
      <form onSubmit={save} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
      {tab==='promotions'?<>
        <label className="block">Mã<input className={field} required maxLength={64} pattern="[A-Za-z0-9_-]+" readOnly={!!editing && promotions.find(p=>p.id===editing)?.status==='Active'} value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})}/></label>
        <label className="block">Tiêu đề<input className={field} required maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label className="block">Mô tả<textarea className={field} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label className="block">Loại giảm<select className={field} value={form.discountType} onChange={e=>setForm({...form,discountType:e.target.value})}><option className="bg-neutral-900" value="Percentage">Phần trăm</option><option className="bg-neutral-900" value="Fixed">Số tiền VND</option></select></label>
        <label className="block">Giá trị<input className={field} type="number" required min="0" max={form.discountType==='Percentage'?100:1000000000} step={form.discountType==='Percentage'?'0.01':1} value={form.discountValue??''} onChange={e=>setForm({...form,discountValue:e.target.value})}/></label>
        <div className="grid grid-cols-2 gap-4">{[['startDate','Bắt đầu'],['endDate','Kết thúc']].map(([k,label])=><label key={k}>{label}<input className={field} type="datetime-local" required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}</div>
        <div className="grid grid-cols-2 gap-4">{[['minSpend','Đơn tối thiểu (VND)'],['maxDiscount','Giảm tối đa (VND)'],['usageLimit','Tổng lượt dùng'],['perUserLimit','Lượt dùng / tài khoản']].map(([k,label])=><label key={k}>{label}<input className={field} type="number" min="0" max="1000000000" step="1" value={form.conditions?.[k]??''} onChange={e=>condition(k,e.target.value)}/></label>)}</div>
        <p className="text-sm text-gray-400">Để trống giới hạn nếu không giới hạn. Đơn giữ chỗ còn hiệu lực cũng giữ lượt dùng; lượt được giải phóng khi hủy hoặc hết hạn.</p>
        <label className="block">URL ảnh banner<input className={field} type="url" maxLength={2000} value={form.bannerImage||''} onChange={e=>setForm({...form,bannerImage:e.target.value})}/></label>
      </>:<>
        <label className="block">Sự kiện<select className={field} value={form.triggerVariable} onChange={e=>setForm({...form,triggerVariable:e.target.value,conditionParams:{}})}>{Object.entries(labels).map(([v,label])=><option className="bg-neutral-900" key={v} value={v}>{label}</option>)}</select></label>
        <label className="block">Điều chỉnh (VND / ghế)<input className={field} type="number" required min="-1000000" max="1000000" step="1" value={form.adjustmentValue??''} onChange={e=>setForm({...form,adjustmentValue:e.target.value})}/></label>
        {['HOLIDAY','SNEAK_SHOW'].includes(form.triggerVariable)&&<label className="block">{form.triggerVariable==='HOLIDAY'?'Ngày lễ (YYYY-MM-DD), cách nhau bằng dấu phẩy':'ID suất chiếu, cách nhau bằng dấu phẩy'}<textarea className={field} required value={listText} onChange={e=>setListText(e.target.value)}/></label>}
        {form.triggerVariable==='LATE_NIGHT'&&<label className="block">Từ giờ<input className={field} type="number" min="0" max="23" step="1" required value={form.conditionParams.startHour??22} onChange={e=>setForm({...form,conditionParams:{startHour:Number(e.target.value)}})}/></label>}
      </>}
      <label className="block">Trạng thái<select className={field} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['Active','Disabled',...(form.status==='Used'?['Used']:[])].map(v=><option className="bg-neutral-900" key={v}>{v}</option>)}</select></label>
      </fieldset>{formError&&<p role="alert" className="text-red-400">{formError}</p>}
      <div className="flex justify-end gap-4"><button type="button" disabled={busy} onClick={()=>setForm(null)}>Hủy</button><button disabled={busy} className="bg-primary px-5 py-2 rounded-lg">{busy?'Đang lưu…':'Lưu'}</button></div>
      </form></section></div>}
  </div>;
}
