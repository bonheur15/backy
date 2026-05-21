import { useState, useEffect } from 'react';
import type { LogicBlock } from '../types';
import CodeEditor from './CodeEditor';
import { IconX } from './Icons';

export function LogicBlockModal({ isOpen, block, onClose, onSave, x = 100, y = 100 }: any) {
  const [form, setForm] = useState<any>({ name: '', inputs: [], outputs: [], logic: '// Write your logic here\n', isFavorite: false });
  useEffect(() => { if (block) setForm(block); else setForm({ name: '', inputs: [], outputs: [], logic: '// Write your logic here\n', isFavorite: false }); }, [block, isOpen]);
  if (!isOpen) return null;
  const handleSave = () => onSave({ ...form, id: block?.id || `block_${Date.now()}`, position: block?.position || { x, y } });
  const renderFields = (title: string, key: string) => (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center"><h4 className="text-slate-500 text-xs font-bold uppercase">{title}</h4><button className="btn h-7 px-2 text-[11px]" onClick={() => setForm({ ...form, [key]: [...form[key], { name: '', type: 'string' }] })}>+ Add</button></div>
      <div className="flex flex-col gap-2">{form[key].map((f: any, i: number) => (
        <div key={i} className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-100">
          <input type="text" placeholder="Name" className="input-field input-field-mono h-8 flex-1" value={f.name} onChange={e => { const up = [...form[key]]; up[i].name = e.target.value; setForm({ ...form, [key]: up }); }} />
          <select className="input-field h-8 w-24" value={f.type} onChange={e => { const up = [...form[key]]; up[i].type = e.target.value; setForm({ ...form, [key]: up }); }}><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option><option value="any">any</option></select>
          <button className="btn btn-danger w-8 h-8 p-0" onClick={() => setForm({ ...form, [key]: form[key].filter((_: any, idx: number) => idx !== i) })}><IconX size={12} /></button>
        </div>
      ))}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-5" onClick={onClose}>
      <div className="w-full max-w-[850px] bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="text-lg font-bold">{block ? 'Edit' : 'Create'} Logic Block</h3><label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><input type="checkbox" className="w-4 h-4" checked={form.isFavorite} onChange={e => setForm({ ...form, isFavorite: e.target.checked })} /> Favorite</label></div>
        <div className="flex flex-1 min-h-0 bg-white"><div className="w-[300px] border-r border-slate-100 p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-slate-500 uppercase">Block Name</label><input type="text" className="input-field input-field-mono" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
          {renderFields('Inputs', 'inputs')}{renderFields('Outputs', 'outputs')}
        </div><div className="flex-1 p-6 flex flex-col gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase">Logic (TypeScript)</label>
          <div className="flex-1 border rounded overflow-hidden shadow-inner"><CodeEditor value={form.logic} onChange={v => setForm({ ...form, logic: v })} language="typescript" /></div>
        </div></div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary px-8" onClick={handleSave} disabled={!form.name}>Save Logic Block</button></div>
      </div>
    </div>
  );
}
