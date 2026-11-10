import PricingRuleEditor from '../../components/PricingRuleEditor';
import PromotionEditor from '../../components/PromotionEditor';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Eye, EyeOff, Filter, LoaderCircle, Plus, Search, Tag, TrendingUp, Trash2 } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import ProgramModal from '../../components/ProgramModal';
import ProgramDetailsModal from './ProgramDetailsModal';
import { useAuth } from '../../context/AuthContext';
import { weekendDaysLabel } from '../../utils/pricingRuleForm';
const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const blankPromo = () => ({ code:'', title:'', description:'', discountType:'Percentage', discountValue:'', startDate:'', endDate:'', status:'Active', bannerImage:'', conditions:{}, version:null });
const blankRule = () => ({ triggerVariable:'WEEKEND', adjustmentValue:'', status:'Active', conditionParams:{}, version:null });
const labels = { WEEKEND:'Cuối tuần', HOLIDAY:'Ngày lễ', LATE_NIGHT:'Giờ vàng', SNEAK_SHOW:'Suất chiếu sớm' };
const legacy = { 'Cuối tuần':'WEEKEND', 'Ngày Lễ':'HOLIDAY', 'Giờ vàng':'LATE_NIGHT', 'Suất chiếu sớm':'SNEAK_SHOW' };
const number = value => Number(value || 0).toLocaleString('vi-VN');
const displayDate = value => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
};
const itemStatus = (item, promotion) => item.status === 'Active' && promotion && new Date(item.endDate) <= new Date() ? 'Expired' : item.status;
const statusLabels = { Active: 'Đang hoạt động', Disabled: 'Vô hiệu hóa', Expired: 'Hết hạn' };
const statusStyles = { Active: 'border-green-500/20 bg-green-500/10 text-green-400', Disabled: 'border-red-500/20 bg-red-500/10 text-red-400', Expired: 'border-orange-500/20 bg-orange-500/10 text-orange-400' };
const ruleConditions = rule => {
  const trigger=legacy[rule.triggerVariable]||rule.triggerVariable, c=rule.conditionParams||{};
  if(trigger==='WEEKEND')return weekendDaysLabel(c.daysOfWeek);
  if(trigger==='LATE_NIGHT')return 'Từ '+String(c.startHour??22).padStart(2,'0')+':00';
  if(trigger==='HOLIDAY')return Array.isArray(c.dates)?c.dates.map(d=>new Date(d+'T00:00:00').toLocaleDateString('vi-VN')).join(', '):'Chưa cấu hình ngày lễ';
  if(trigger==='SNEAK_SHOW')return 'Áp dụng cho '+(Array.isArray(c.showtimeIds)?c.showtimeIds.length:0)+' suất chiếu';
  return 'Cần cập nhật điều kiện';
};
export default function PromotionManagement() {
  const { user } = useAuth();
  const token = user?.token;
  const allowed = ['Manager','Admin'].includes(user?.role);
  const [params,setParams] = useSearchParams();
  const tab = params.get('tab') === 'pricing' ? 'pricing' : 'promotions';
  const [promotions,setPromotions] = useState([]), [rules,setRules] = useState([]);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [editing,setEditing] = useState(null), [form,setForm] = useState(null), [formError,setFormError] = useState('');
  const [search, setSearch] = useState(''), [filterStatus, setFilterStatus] = useState('All');
  const [selected, setSelected] = useState(null), [deleting, setDeleting] = useState(null), [deleteError, setDeleteError] = useState('');
  const action = useRef(false), generation = useRef(0);
  const request = useCallback(async (url, options = {}) => {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
    const abort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    try {
      const res=await fetch(API+url,{...options,signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token}});
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||(res.status===403?'Bạn không có quyền thực hiện thao tác này.':'Không thể hoàn thành yêu cầu.'));
      return data;
    }catch(e){if(controller.signal.aborted)throw new Error('Hết thời gian chờ. Hãy tải lại danh sách để kiểm tra kết quả trước khi thao tác lại.');throw e;}finally{clearTimeout(timeout);options.signal?.removeEventListener('abort', abort);}
  }, [token]);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try {
      const [p,r] = await Promise.all([request('/promotions'), request('/pricing-rules')]);
      if (!Array.isArray(p) || !Array.isArray(r)) throw new Error('Dữ liệu danh sách không hợp lệ');
      if (current===generation.current) { setPromotions(p); setRules(r); }
    } catch(e) { if(current===generation.current) setError(e.message); }
    finally { if(current===generation.current) setLoading(false); }
  }, [request]);
  useEffect(()=> {
    let disposed = false;
    if (allowed) { void Promise.resolve().then(() => { if (!disposed) return load(); }); }
    const counter = generation;
    return ()=>{disposed = true; counter.current++;};
  }, [allowed, load]);
  if (!allowed) return <Navigate to="/" replace />;
  function open(item) {
    setSelected(null);
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
  async function toggleStatus(item) {
    if(action.current)return;
    action.current=true;setBusy(true);setError('');setNotice('');
    const status = item.status === 'Disabled' ? 'Active' : 'Disabled';
    try {await request((tab==='promotions'?'/promotions/':'/pricing-rules/')+item.id+'/status',{method:'PATCH',body:JSON.stringify({status,version:item.version??null})});setNotice(status==='Active'?'Đã kích hoạt lại chương trình.':'Đã vô hiệu hóa chương trình.');await load();}
    catch(e){setError(e.message);}finally{action.current=false;setBusy(false);}
  }
  async function archive() {
    if(action.current || !deleting)return;
    const { item, promotion } = deleting;
    action.current=true;setBusy(true);setDeleteError('');setNotice('');
    try {
      await request((promotion?'/promotions/':'/pricing-rules/')+item.id+'/archive'+(item.version==null?'':'?version='+item.version),{method:'DELETE'});
      setDeleting(null);setNotice(promotion?'Đã xóa mềm mã khuyến mãi khỏi danh sách.':'Đã xóa mềm luật giá khỏi danh sách.');await load();
    }catch(e){setDeleteError(e.message);}finally{action.current=false;setBusy(false);}
  }
  const promotion = tab === 'promotions';
  const query = search.trim().toLocaleLowerCase('vi-VN');
  const statusOrder = { Active: 0, Disabled: 1, Expired: 2 };
  const filtered = (promotion ? promotions : rules).filter(item =>
    (filterStatus === 'All' || itemStatus(item, promotion) === filterStatus) &&
    (!query || (promotion ? [item.code, item.title] : [labels[legacy[item.triggerVariable] || item.triggerVariable], item.triggerVariable])
      .some(value => String(value || '').toLocaleLowerCase('vi-VN').includes(query))))
    .sort((a, b) => (statusOrder[itemStatus(a, promotion)] ?? 3) - (statusOrder[itemStatus(b, promotion)] ?? 3));
  return <div className="h-full text-white"><div className="mx-auto max-w-7xl">
    <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <h1 className="flex items-center gap-3 font-display text-3xl font-bold"><Tag className="h-8 w-8 shrink-0 text-primary" />Khuyến mãi & Giá động</h1>
      <div className="flex flex-wrap items-center gap-3">
        <div className="group relative min-w-[220px] flex-1 sm:flex-none"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-primary" /><input type="search" aria-label={promotion ? 'Tìm mã hoặc tiêu đề khuyến mãi' : 'Tìm luật giá động'} placeholder={promotion ? 'Tìm mã, tiêu đề...' : 'Tìm luật giá...'} value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-2.5 pl-9 pr-4 text-sm outline-none placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50" /></div>
        <CustomSelect floating ariaLabel="Lọc trạng thái chương trình" value={filterStatus} onChange={setFilterStatus} icon={Filter} options={[{ value: 'All', label: 'Tất cả trạng thái' }, { value: 'Active', label: 'Đang hoạt động' }, { value: 'Disabled', label: 'Vô hiệu hóa' }, ...(promotion ? [{ value: 'Expired', label: 'Hết hạn' }] : [])]} />
        <button type="button" disabled={busy||loading} onClick={()=>open(null)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium shadow-lg shadow-primary/20 hover:bg-red-700 disabled:opacity-50"><Plus className="h-4 w-4" />Thêm mới</button>
      </div>
    </div>
    <div className="mb-6 flex w-fit flex-wrap gap-1 rounded-xl border border-white/10 bg-[#1a1a1a] p-1">{['promotions','pricing'].map(t=><button type="button" key={t} disabled={busy||!!form||!!selected||!!deleting} onClick={()=>{setParams({tab:t}); setSearch(''); setFilterStatus('All');}} aria-pressed={tab===t} className={'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 '+(tab===t?'bg-primary text-white shadow-lg shadow-primary/20':'text-gray-400 hover:bg-white/5 hover:text-white')}>{t==='promotions'?<Tag className="h-4 w-4" />:<TrendingUp className="h-4 w-4" />}{t==='promotions'?'Khuyến mãi':'Giá động'}</button>)}</div>
    {error && <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"><AlertCircle className="h-4 w-4" />{error}<button type="button" disabled={loading} onClick={()=>load()} className="ml-auto underline">Thử lại</button></div>}{notice && <p role="status" className="mb-4 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">{notice}</p>}
    <div className="glass-panel overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/80 backdrop-blur-xl"><div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left"><thead><tr className="border-b border-white/10 bg-white/5 text-gray-300"><th className="p-4 font-medium">{promotion?'Mã / Tiêu đề':'Sự kiện'}</th><th className="p-4 font-medium">Giá trị</th><th className="p-4 font-medium">Hiệu lực / Điều kiện</th><th className="p-4 font-medium">Trạng thái</th><th className="p-4 text-center font-medium">Hành động</th></tr></thead><tbody className="divide-y divide-white/5">
      {loading ? <tr><td colSpan={5} className="p-8 text-center text-gray-400"><div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />Đang tải dữ liệu...</td></tr> : filtered.map(item=><tr key={item.id} onClick={event => { if (!busy && !event.target.closest('button, input, select, a')) setSelected({ item, promotion }); }} className="cursor-pointer transition-colors hover:bg-white/5"><td className="max-w-[240px] p-4"><button type="button" disabled={busy} onClick={() => setSelected({ item, promotion })} aria-label={'Xem chi tiết '+(item.code||labels[legacy[item.triggerVariable]||item.triggerVariable]||item.triggerVariable)} className="rounded text-left text-base font-bold hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{promotion?item.code:labels[legacy[item.triggerVariable]||item.triggerVariable]||item.triggerVariable}</button>{promotion&&<div className="mt-1 break-words text-sm text-gray-400">{item.title}</div>}</td>
        <td className="whitespace-nowrap p-4 text-sm font-medium text-gray-200">{promotion?(item.discountType?.toUpperCase()==='PERCENTAGE'?number(item.discountValue)+'%':number(item.discountValue)+'đ'):(Number(item.adjustmentValue)>0?'+':'')+number(item.adjustmentValue)+'đ'}</td>
        <td className="max-w-[300px] break-words p-4 text-sm text-gray-300">{promotion?<div className="space-y-1.5"><div><span className="text-gray-500">Từ: </span>{displayDate(item.startDate)}</div><div><span className="text-gray-500">Đến: </span>{displayDate(item.endDate)}</div>{item.conditions?.minSpend!=null&&<div className="text-gray-400">Tối thiểu: {number(item.conditions.minSpend)}đ</div>}</div>:ruleConditions(item)}</td>
        <td className="p-4"><span className={'inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium '+(statusStyles[itemStatus(item,promotion)]||'border-white/10 bg-white/5 text-gray-300')}>{statusLabels[itemStatus(item,promotion)]||item.status}</span></td>
        <td className="p-4">
          <div className="flex items-center justify-center gap-2">
            <button type="button" disabled={busy || !['Active','Disabled'].includes(item.status)} onClick={()=>toggleStatus(item)}
              title={item.status==='Disabled'?'Kích hoạt lại':'Vô hiệu hóa'} aria-label={(item.status==='Disabled'?'Kích hoạt lại ':'Vô hiệu hóa ')+(item.code||item.triggerVariable)}
              className={'p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed '+(item.status==='Disabled'?'text-green-400 hover:bg-green-400/20':'text-orange-400 hover:bg-orange-400/20')}>
              {item.status==='Disabled'?<Eye className="w-4 h-4" aria-hidden="true" />:<EyeOff className="w-4 h-4" aria-hidden="true" />}
            </button>
            <button type="button" disabled={busy || item.status!=='Disabled'} onClick={()=>{setDeleting({item,promotion});setDeleteError('');}}
              title={item.status==='Disabled'?'Xóa mềm khỏi danh sách':'Vô hiệu hóa chương trình trước khi xóa'} aria-label={'Xóa mềm '+(item.code||labels[legacy[item.triggerVariable]||item.triggerVariable]||item.triggerVariable)}
              className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </td></tr>)}
      {!loading&&!error&&filtered.length===0&&<tr><td colSpan={5} className="p-12 text-center text-gray-400">{query||filterStatus!=='All'?'Không tìm thấy chương trình phù hợp.':'Chưa có dữ liệu.'}</td></tr>}
    </tbody></table></div></div>
    </div>
    {selected && <ProgramDetailsModal item={selected.item} promotion={selected.promotion} request={request} onClose={()=>setSelected(null)} onEdit={open} />}
    {deleting && <ProgramModal compact title={deleting.promotion?'Xóa Khuyến mãi?':'Xóa Luật giá?'} icon={AlertTriangle} busy={busy} onClose={()=>setDeleting(null)} footer={<>
      <button type="button" disabled={busy} onClick={()=>setDeleting(null)} className="rounded-xl bg-white/10 px-5 py-3 font-medium hover:bg-white/15 disabled:opacity-40">Hủy bỏ</button>
      <button type="button" disabled={busy} onClick={archive} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold hover:bg-red-700 disabled:opacity-40">{busy?<LoaderCircle className="h-4 w-4 animate-spin" />:<Trash2 className="h-4 w-4" />}{busy?'Đang xóa...':'Xóa khỏi danh sách'}</button>
    </>}><p className="text-sm leading-relaxed text-gray-400"><strong className="text-white">{deleting.item.code||labels[legacy[deleting.item.triggerVariable]||deleting.item.triggerVariable]||deleting.item.triggerVariable}</strong> sẽ được ẩn khỏi danh sách. Dữ liệu và lịch sử sử dụng vẫn được lưu giữ trong hệ thống.</p>{deleteError&&<p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{deleteError}</p>}</ProgramModal>}
    {form && tab==='pricing' && <PricingRuleEditor initialValue={form} editing={!!editing} busy={busy} error={formError} onSave={savePricing} onClose={()=>setForm(null)} presetScope={user?.id || user?.email || 'local'} />}
    {form && tab==='promotions' && <PromotionEditor initialValue={form} editing={!!editing} busy={busy} error={formError} onSave={savePromotion} onClose={()=>setForm(null)} presetScope={user?.id || user?.email || 'local'} />}
  </div>;
}
