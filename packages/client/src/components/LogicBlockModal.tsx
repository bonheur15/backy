import { useState, useEffect } from 'react';
import type { LogicBlock } from '../types';
import CodeEditor from './CodeEditor';
import { IconX } from './Icons';

interface LogicBlockModalProps {
  isOpen: boolean;
  block: LogicBlock | null;
  onClose: () => void;
  onSave: (block: LogicBlock) => void;
  x?: number;
  y?: number;
}

export function LogicBlockModal({
  isOpen,
  block,
  onClose,
  onSave,
  x = 100,
  y = 100
}: LogicBlockModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [inputFields, setInputFields] = useState<{ name: string; type: string; required?: boolean }[]>([]);
  const [outputFields, setOutputFields] = useState<{ name: string; type: string; required?: boolean }[]>([]);
  const [logic, setLogic] = useState('');

  // Load logic block data if editing
  useEffect(() => {
    if (block) {
      setName(block.name);
      setInputFields(block.inputs || []);
      setOutputFields(block.outputs || []);
      setLogic(block.logic);
      setStep(1);
    } else {
      setName('');
      setInputFields([{ name: 'id', type: 'number', required: true }]);
      setOutputFields([{ name: 'result', type: 'any', required: true }]);
      setLogic('return {\n  result: true\n};');
      setStep(1);
    }
  }, [block, isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && !name) return;
    setStep(s => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSave = () => {
    const finalBlock: LogicBlock = {
      id: block?.id || `block_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
      name: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      inputs: inputFields,
      outputs: outputFields,
      logic,
      position: block?.position || { x, y },
      isFavorite: block?.isFavorite || false
    };
    onSave(finalBlock);
  };

  const addField = (target: 'input' | 'output') => {
    const newField = { name: '', type: 'string', required: true };
    if (target === 'input') setInputFields([...inputFields, newField]);
    if (target === 'output') setOutputFields([...outputFields, newField]);
  };

  const removeField = (target: 'input' | 'output', index: number) => {
    if (target === 'input') setInputFields(inputFields.filter((_, i) => i !== index));
    if (target === 'output') setOutputFields(outputFields.filter((_, i) => i !== index));
  };

  const updateField = (target: 'input' | 'output', index: number, key: string, val: any) => {
    const list = target === 'input' ? [...inputFields] : [...outputFields];
    list[index] = { ...list[index], [key]: val };
    if (target === 'input') setInputFields(list);
    if (target === 'output') setOutputFields(list);
  };

  const renderFieldEditor = (title: string, target: 'input' | 'output', fields: any[]) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ color: 'var(--accent)', fontSize: '14px', letterSpacing: '0.5px' }}>{title}</h4>
          <button className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => addField(target)}>
            + Add Field
          </button>
        </div>
        {fields.length === 0 ? (
          <div style={{ color: 'var(--color-dim)', fontSize: '13px', fontStyle: 'italic' }}>No fields defined. (Optional)</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {fields.map((f, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Field Name"
                  className="input-field"
                  style={{ flex: 2, padding: '6px 10px', fontSize: '13px' }}
                  value={f.name}
                  onChange={(e) => updateField(target, idx, 'name', e.target.value)}
                />
                <select
                  className="input-field"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }}
                  value={f.type}
                  onChange={(e) => updateField(target, idx, 'type', e.target.value)}
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="any">any</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-muted)', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={f.required !== false}
                    onChange={(e) => updateField(target, idx, 'required', e.target.checked)}
                  />
                  Req
                </label>
                <button
                  className="btn"
                  style={{ padding: '6px 10px', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--color-delete)', background: 'transparent' }}
                  onClick={() => removeField(target, idx)}
                >
                  <IconX size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ width: step === 3 ? '800px' : '550px' }}>
        {/* Wizard Header Progress Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent)' }}>
              {block ? 'Edit Logic Block' : 'Create Logic Block'}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>
              Step {step} of 3
            </span>
          </div>
          {/* Progress Tracker */}
          <div style={{ display: 'flex', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(step / 3) * 100}%`, background: 'var(--accent)', transition: 'width 0.2s ease' }} />
          </div>
        </div>

        {/* Step 1: Basic Name */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Function Name</label>
              <input
                type="text"
                placeholder="e.g. calculateScore, verifyToken"
                className="input-field input-field-mono"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <span style={{ fontSize: '11px', color: 'var(--color-dim)' }}>Must be a valid TypeScript function name.</span>
            </div>
          </div>
        )}

        {/* Step 2: Arguments and Returns */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {renderFieldEditor('Input Arguments', 'input', inputFields)}
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
            {renderFieldEditor('Return Payload Structure', 'output', outputFields)}
          </div>
        )}

        {/* Step 3: Logic Implementation */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>
                Exported as: <span style={{ color: 'var(--accent)' }}>{name}</span>(...)
              </div>
            </div>
            <div style={{ height: '400px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <CodeEditor
                value={logic}
                onChange={setLogic}
                language="typescript"
                onSave={handleSave}
              />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
              Tip: You can use `db` and `schema` imports globally.
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn" onClick={step === 1 ? onClose : handleBack} style={{ minWidth: '80px' }}>
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {step === 3 && (
              <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: '100px', background: 'var(--accent)' }}>
                Save Logic
              </button>
            )}
            {step < 3 && (
              <button 
                className="btn btn-primary" 
                onClick={handleNext} 
                style={{ minWidth: '100px', background: 'var(--accent)' }}
                disabled={step === 1 && !name}
              >
                Next Step
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
