import { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  language?: string;
}

export default function CodeEditor({ value, onChange, onSave, language = 'plaintext' }: CodeEditorProps) {
  const extraLibRef = useRef<any>(null);

  useEffect(() => {
    return () => { if (extraLibRef.current) extraLibRef.current.dispose(); };
  }, []);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    monaco.editor.defineTheme('backy-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' },
        { token: 'keyword', foreground: '3b82f6', fontStyle: 'bold' },
        { token: 'string', foreground: '10b981' },
        { token: 'number', foreground: 'f59e0b' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#0f172a',
        'editor.lineHighlightBackground': '#f8fafc',
        'editorGutter.background': '#f8fafc',
        'editorLineNumber.foreground': '#94a3b8',
        'editorLineNumber.activeForeground': '#3b82f6',
      }
    });
    
    monaco.editor.setTheme('backy-light');

    if (language === 'typescript') {
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        lib: ['es2020'],
      });
      if (extraLibRef.current) extraLibRef.current.dispose();
      extraLibRef.current = monaco.languages.typescript.typescriptDefaults.addExtraLib(`
        declare const query: Record<string, any>;
        declare const body: Record<string, any>;
        declare const params: Record<string, any>;
        declare const db: any;
      `, 'global-vars.d.ts');
    }

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) onSave();
    });
  };

  const options = {
    minimap: { enabled: false },
    fontSize: 13,
    fontFamily: 'JetBrains Mono, monospace',
    lineHeight: 18,
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      useShadows: false,
      verticalScrollbarSize: 6,
      horizontalScrollbarSize: 6,
    },
    lineNumbersMinChars: 3,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    padding: { top: 10, bottom: 10 },
  } as const;

  return (
    <div className="w-full h-full bg-white border border-slate-200 rounded-sm overflow-hidden relative">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        options={options}
        loading={
          <div className="flex items-center justify-center h-full text-slate-400 font-mono text-xs">
            Initializing code editor...
          </div>
        }
      />
    </div>
  );
}
