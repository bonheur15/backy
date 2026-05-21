import { useState, useEffect } from 'react';
import type { Endpoint, DBModel } from '../types';
import CodeEditor from './CodeEditor';
import { IconX } from './Icons';

export function EndpointWizardModal({ isOpen, endpoint, onClose, onSave, x = 100, y = 100 }: any) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({ name: '', path: '', method: 'get', query: [], body: [], response: [{ name: 'status', type: 'string', required: true }], logic: 'return { status: "ok" };', isAuthorized: false });

  useEffect(() => {
    if (endpoint) setForm({ ...endpoint, query: endpoint.inputs.query, body: endpoint.inputs.body, response: endpoint.outputs.response });
    else setForm({ name: '', path: '', method: 'get', query: [], body: [], response: [{ name: 'status', type: 'string', required: true }], logic: 'return { status: "ok" };', isAuthorized: false });
    setStep(1);
  }, [endpoint, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ id: endpoint?.id || `${form.method}_${form.name.toLowerCase()}`, ...form, name: form.name.toLowerCase(), inputs: { query: form.query, body: form.body }, outputs: { response: form.response }, position: endpoint?.position || { x, y } });
  };

  const renderFields = (title: string, key: string) => (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h4 className="text-primary text-sm font-bold">{title}</h4>
        <button className="btn h-7 px-2 text-[11px]" onClick={() => setForm({ ...form, [key]: [...form[key], { name: '', type: 'string', required: true }] })}>+ Add Field</button>
      </div>
      <div className="flex flex-col gap-2">
        {form[key].map((f: any, i: number) => (
          <div key={i} className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-100">
            <input type="text" placeholder="Name" className="input-field input-field-mono h-8 flex-[2]" value={f.name} onChange={e => { const up = [...form[key]]; up[i].name = e.target.value; setForm({ ...form, [key]: up }); }} />
            <select className="input-field h-8 flex-1" value={f.type} onChange={e => { const up = [...form[key]]; up[i].type = e.target.value; setForm({ ...form, [key]: up }); }}><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option></select>
            <button className="btn btn-danger w-8 h-8 p-0" onClick={() => setForm({ ...form, [key]: form[key].filter((_: any, idx: number) => idx !== i) })}><IconX size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-5" onClick={onClose}>
      <div className="w-full max-w-[600px] bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()} style={{ maxWidth: step === 4 ? '900px' : '600px' }}>
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold">{endpoint ? 'Edit' : 'Create'} Endpoint</h3>
            <span className="text-xs text-slate-400 font-mono">Step {step} of 4</span>
          </div>
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} /></div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-slate-500 uppercase">Name</label><input type="text" className="input-field input-field-mono" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-slate-500 uppercase">Method</label><div className="flex gap-2">{['get', 'post', 'put', 'delete'].map(m => <button key={m} className={`btn flex-1 uppercase font-mono text-[11px] ${form.method === m ? 'border-primary bg-blue-50 text-primary' : ''}`} onClick={() => setForm({ ...form, method: m })}>{m}</button>)}</div></div>
              <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-slate-500 uppercase">Path</label><input type="text" className="input-field input-field-mono" value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} /></div>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-100 cursor-pointer"><div className="flex-1"><div className="text-sm font-bold">Authentication</div><div className="text-[11px] text-slate-500">Requires valid JWT token</div></div><input type="checkbox" className="w-5 h-5" checked={form.isAuthorized} onChange={e => setForm({ ...form, isAuthorized: e.target.checked })} /></label>
            </div>
          )}
          {step === 2 && <div className="flex flex-col gap-6">{renderFields('Query Params', 'query')}<div className="h-px bg-slate-100" />{form.method !== 'get' ? renderFields('JSON Body', 'body') : <div className="p-4 bg-slate-50 text-slate-400 text-xs text-center rounded border border-dashed border-slate-200">Body not supported for GET</div>}</div>}
          {step === 3 && renderFields('Response Body', 'response')}
          {step === 4 && <div className="h-[400px] flex flex-col gap-2"><label className="text-xs font-bold text-slate-500 uppercase">Logic (TS)</label><div className="flex-1 border rounded overflow-hidden"><CodeEditor value={form.logic} onChange={v => setForm({ ...form, logic: v })} language="typescript" /></div></div>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between">
          <button className="btn" onClick={onClose}>Cancel</button>
          <div className="flex gap-2">
            {step > 1 && <button className="btn" onClick={() => setStep(s => s - 1)}>Back</button>}
            <button className="btn btn-primary" onClick={step < 4 ? () => setStep(s => s + 1) : handleSave} disabled={!form.name || !form.path}>{step < 4 ? 'Next' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DBModelModal({ isOpen, model, onClose, onSave, onPushChanges, x = 100, y = 100 }: any) {
  const [form, setForm] = useState<any>({ name: '', columns: [{ name: 'id', type: 'integer', primaryKey: true, autoIncrement: true }] });
  useEffect(() => { if (model) setForm(model); else setForm({ name: '', columns: [{ name: 'id', type: 'integer', primaryKey: true, autoIncrement: true }] }); }, [model, isOpen]);
  if (!isOpen) return null;
  const handleSave = () => onSave({ ...form, id: model?.id || form.name.toLowerCase(), name: form.name.toLowerCase(), position: model?.position || { x, y } });
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-5" onClick={onClose}>
      <div className="w-full max-w-[800px] bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="text-lg font-bold">{model ? 'Edit' : 'Create'} Table</h3>{model && onPushChanges && <button className="btn btn-primary h-8 text-[11px]" onClick={onPushChanges}>Push Changes</button>}</div>
        <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-slate-500 uppercase">Table Name</label><input type="text" className="input-field input-field-mono" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center"><h4 className="text-slate-500 text-sm font-bold uppercase">Columns</h4><button className="btn h-7 px-2 text-[11px]" onClick={() => setForm({ ...form, columns: [...form.columns, { name: '', type: 'text' }] })}>+ Add Column</button></div>
            <div className="flex flex-col gap-2">{form.columns.map((c: any, i: number) => (
              <div key={i} className="flex gap-2 items-center bg-slate-50 p-3 rounded border border-slate-100">
                <input type="text" placeholder="Name" className="input-field input-field-mono h-8 flex-1" value={c.name} onChange={e => { const up = [...form.columns]; up[i].name = e.target.value; setForm({ ...form, columns: up }); }} />
                <select className="input-field h-8 w-28" value={c.type} onChange={e => { const up = [...form.columns]; up[i].type = e.target.value; setForm({ ...form, columns: up }); }}><option value="integer">integer</option><option value="text">text</option><option value="real">real</option></select>
                <div className="flex gap-3 px-2 text-[11px] font-bold text-slate-500"><label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={!!c.primaryKey} onChange={e => { const up = [...form.columns]; up[i].primaryKey = e.target.checked; setForm({ ...form, columns: up }); }} /> PK</label><label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={!!c.notNull} onChange={e => { const up = [...form.columns]; up[i].notNull = e.target.checked; setForm({ ...form, columns: up }); }} /> NN</label></div>
                <input type="text" placeholder="Default" className="input-field input-field-mono h-8 w-32" value={c.default || ''} onChange={e => { const up = [...form.columns]; up[i].default = e.target.value; setForm({ ...form, columns: up }); }} />
                <button className="btn btn-danger w-8 h-8 p-0" onClick={() => setForm({ ...form, columns: form.columns.filter((_: any, idx: number) => idx !== i) })}><IconX size={12} /></button>
              </div>
            ))}</div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary px-6" onClick={handleSave} disabled={!form.name || form.columns.length === 0}>Save Table</button></div>
      </div>
    </div>
  );
}
