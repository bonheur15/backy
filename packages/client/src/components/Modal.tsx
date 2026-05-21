import { useState, useEffect } from 'react';
import type { Endpoint, DBModel } from '../types';
import CodeEditor from './CodeEditor';
import { IconX } from './Icons';

interface EndpointWizardModalProps {
  isOpen: boolean;
  endpoint: Endpoint | null; // null if creating new
  onClose: () => void;
  onSave: (endpoint: Endpoint) => void;
  x?: number;
  y?: number;
}

export function EndpointWizardModal({
  isOpen,
  endpoint,
  onClose,
  onSave,
  x = 100,
  y = 100
}: EndpointWizardModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [method, setMethod] = useState<'get' | 'post' | 'put' | 'delete'>('get');
  const [queryFields, setQueryFields] = useState<{ name: string; type: string; required?: boolean }[]>([]);
  const [bodyFields, setBodyFields] = useState<{ name: string; type: string; required?: boolean }[]>([]);
  const [responseFields, setResponseFields] = useState<{ name: string; type: string; required?: boolean }[]>([]);
  const [logic, setLogic] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Load endpoint data if editing
  useEffect(() => {
    if (endpoint) {
      setName(endpoint.name);
      setPath(endpoint.path);
      setMethod(endpoint.method);
      setQueryFields(endpoint.inputs.query || []);
      setBodyFields(endpoint.inputs.body || []);
      setResponseFields(endpoint.outputs.response || []);
      setLogic(endpoint.logic);
      setIsAuthorized(!!endpoint.isAuthorized);
      setStep(1);
    } else {
      setName('');
      setPath('');
      setMethod('get');
      setQueryFields([]);
      setBodyFields([]);
      setResponseFields([
        { name: 'status', type: 'string', required: true }
      ]);
      setLogic('return {\n  status: "ok"\n};');
      setIsAuthorized(false);
      setStep(1);
    }
  }, [endpoint, isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && (!name || !path)) return;
    setStep(s => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSave = () => {
    const finalEndpoint: Endpoint = {
      id: endpoint?.id || `${method}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      method,
      path: path.startsWith('/') ? path : `/${path}`,
      inputs: {
        query: queryFields,
        body: bodyFields
      },
      outputs: {
        response: responseFields
      },
      logic,
      position: endpoint?.position || { x, y },
      isAuthorized
    };
    onSave(finalEndpoint);
  };

  const addField = (target: 'query' | 'body' | 'response') => {
    const newField = { name: '', type: 'string', required: true };
    if (target === 'query') setQueryFields([...queryFields, newField]);
    if (target === 'body') setBodyFields([...bodyFields, newField]);
    if (target === 'response') setResponseFields([...responseFields, newField]);
  };

  const removeField = (target: 'query' | 'body' | 'response', index: number) => {
    if (target === 'query') setQueryFields(queryFields.filter((_, i) => i !== index));
    if (target === 'body') setBodyFields(bodyFields.filter((_, i) => i !== index));
    if (target === 'response') setResponseFields(responseFields.filter((_, i) => i !== index));
  };

  const updateField = (target: 'query' | 'body' | 'response', index: number, key: string, val: any) => {
    const list = target === 'query' ? [...queryFields] : target === 'body' ? [...bodyFields] : [...responseFields];
    list[index] = { ...list[index], [key]: val };
    if (target === 'query') setQueryFields(list);
    if (target === 'body') setBodyFields(list);
    if (target === 'response') setResponseFields(list);
  };

  const renderFieldEditor = (title: string, target: 'query' | 'body' | 'response', fields: any[]) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: 600 }}>{title}</h4>
          <button className="btn" style={{ height: '28px', padding: '0 8px', fontSize: '11px' }} onClick={() => addField(target)}>
            + Add Field
          </button>
        </div>
        {fields.length === 0 ? (
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--color-dim)', fontSize: '12px', textAlign: 'center' }}>
            No fields defined. (Optional)
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {fields.map((f, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Field Name"
                  className="input-field input-field-mono"
                  style={{ flex: 2, height: '34px' }}
                  value={f.name}
                  onChange={(e) => updateField(target, idx, 'name', e.target.value)}
                />
                <select
                  className="input-field"
                  style={{ flex: 1, height: '34px' }}
                  value={f.type}
                  onChange={(e) => updateField(target, idx, 'type', e.target.value)}
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="any">any</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={f.required !== false}
                    onChange={(e) => updateField(target, idx, 'required', e.target.checked)}
                  />
                  Req
                </label>
                <button
                  className="btn btn-danger"
                  style={{ width: '34px', height: '34px', padding: 0 }}
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
      <div className="modal-content animate-fade-in" style={{ maxWidth: step === 4 ? '900px' : '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                {endpoint ? 'Edit Endpoint' : 'Create New Endpoint'}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>
                Step {step} of 4
              </span>
            </div>
            {/* Progress Tracker */}
            <div style={{ display: 'flex', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
              <div style={{ width: `${(step / 4) * 100}%`, background: 'var(--primary)', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </div>

        <div className="modal-body">
          {/* Step 1: Basic endpoint settings */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Endpoint Name</label>
                <input
                  type="text"
                  placeholder="e.g. get_users, create_todo"
                  className="input-field input-field-mono"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                <span style={{ fontSize: '11px', color: 'var(--color-dim)' }}>Must be valid variable name.</span>
              </div>

              <div className="form-group">
                <label className="form-label">HTTP Method</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['get', 'post', 'put', 'delete'] as const).map(m => (
                    <button
                      key={m}
                      className="btn"
                      style={{
                        flex: 1,
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        borderColor: method === m ? `var(--color-${m})` : 'var(--border-color)',
                        background: method === m ? `var(--color-${m})22` : 'white',
                        color: method === m ? `var(--color-${m})` : 'var(--color-text)'
                      }}
                      onClick={() => setMethod(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Route Path</label>
                <input
                  type="text"
                  placeholder="e.g. /users, /todos/:id"
                  className="input-field input-field-mono"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-dim)' }}>Use colon for params, like <code>/users/:id</code>.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '4px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>Require Authentication</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Only allows requests with a valid JWT token.</div>
                </div>
                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  checked={isAuthorized}
                  onChange={(e) => setIsAuthorized(e.target.checked)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Inputs (Query & Body) */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {renderFieldEditor('Query Parameters (query)', 'query', queryFields)}
              <div style={{ height: '1px', background: 'var(--border-color)' }} />
              {method !== 'get' ? (
                renderFieldEditor('JSON Body Payload (body)', 'body', bodyFields)
              ) : (
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--color-dim)', fontSize: '13px', textAlign: 'center' }}>
                  Body payload is not supported for HTTP GET method.
                </div>
              )}
            </div>
          )}

          {/* Step 3: Outputs */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {renderFieldEditor('Response Body (JSON)', 'response', responseFields)}
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--color-muted)', fontSize: '12px' }}>
                <strong>Pro-tip:</strong> Defining response structures enables automatic TypeBox validation and better client-side type safety.
              </div>
            </div>
          )}

          {/* Step 4: Logic Editor */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Endpoint Logic (TypeScript)</label>
                <div style={{ fontSize: '11px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>
                  Available: body, query, params, db, schema, logic
                </div>
              </div>
              <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <CodeEditor
                  value={logic}
                  onChange={setLogic}
                  onSave={handleSave}
                  language="typescript"
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <div style={{ flex: 1 }} />
          {step > 1 && (
            <button className="btn" onClick={handleBack}>Back</button>
          )}
          {step < 4 ? (
            <button className="btn btn-primary" onClick={handleNext} disabled={!name || !path}>
              Next Step
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave}>
              {endpoint ? 'Update Endpoint' : 'Create Endpoint'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface DBModelModalProps {
  isOpen: boolean;
  model: DBModel | null;
  onClose: () => void;
  onSave: (model: DBModel) => void;
  onPushChanges?: () => void;
  x?: number;
  y?: number;
}

export function DBModelModal({
  isOpen,
  model,
  onClose,
  onSave,
  onPushChanges,
  x = 100,
  y = 100
}: DBModelModalProps) {
  const [name, setName] = useState('');
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    if (model) {
      setName(model.name);
      setColumns(model.columns || []);
    } else {
      setName('');
      setColumns([
        { name: 'id', type: 'integer', primaryKey: true, autoIncrement: true }
      ]);
    }
  }, [model, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name || columns.length === 0) return;
    const finalModel: DBModel = {
      id: model?.id || name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      columns: columns.map(c => ({
        ...c,
        name: c.name.replace(/[^a-zA-Z0-9_]/g, '')
      })),
      position: model?.position || { x, y }
    };
    onSave(finalModel);
  };

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'text', notNull: false }]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, key: string, val: any) => {
    const list = [...columns];
    list[index] = { ...list[index], [key]: val };
    setColumns(list);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-fade-in" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
            {model ? 'Edit Database Table' : 'Create New Database Table'}
          </h3>
          {model && onPushChanges && (
            <button 
              className="btn btn-primary" 
              style={{ height: '32px', fontSize: '12px' }}
              onClick={onPushChanges}
            >
              Push Changes to DB
            </button>
          )}
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Table Name</label>
            <input
              type="text"
              placeholder="e.g. users, products, tasks"
              className="input-field input-field-mono"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: 'var(--color-muted)', fontSize: '14px', fontWeight: 600 }}>Columns & Fields</h4>
              <button className="btn" style={{ height: '28px', padding: '0 8px', fontSize: '11px' }} onClick={addColumn}>
                + Add Column
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {columns.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <input
                    type="text"
                    placeholder="Name"
                    className="input-field input-field-mono"
                    style={{ flex: 1, height: '34px' }}
                    value={c.name}
                    onChange={(e) => updateColumn(idx, 'name', e.target.value)}
                  />
                  <select
                    className="input-field"
                    style={{ width: '100px', height: '34px' }}
                    value={c.type}
                    onChange={(e) => updateColumn(idx, 'type', e.target.value)}
                  >
                    <option value="integer">integer</option>
                    <option value="text">text</option>
                    <option value="real">real</option>
                  </select>

                  <div style={{ display: 'flex', gap: '10px', padding: '0 4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-muted)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={c.primaryKey} onChange={(e) => updateColumn(idx, 'primaryKey', e.target.checked)} />
                      PK
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-muted)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={c.notNull} onChange={(e) => updateColumn(idx, 'notNull', e.target.checked)} />
                      NN
                    </label>
                  </div>

                  <input
                    type="text"
                    placeholder="Default"
                    className="input-field input-field-mono"
                    style={{ width: '100px', height: '34px' }}
                    value={c.default || ''}
                    onChange={(e) => updateColumn(idx, 'default', e.target.value)}
                  />

                  <button
                    className="btn btn-danger"
                    style={{ width: '34px', height: '34px', padding: 0 }}
                    onClick={() => removeColumn(idx)}
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name || columns.length === 0}>
            Save Table
          </button>
        </div>
      </div>
    </div>
  );
}
