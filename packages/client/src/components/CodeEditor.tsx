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

  // Clean up extra libs on unmount
  useEffect(() => {
    return () => {
      if (extraLibRef.current) {
        extraLibRef.current.dispose();
      }
    };
  }, []);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    // Define a custom theme to match Backy's light mode theme
    monaco.editor.defineTheme('backy-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' },
        { token: 'keyword', foreground: '2563eb', fontStyle: 'bold' },
        { token: 'string', foreground: '059669' },
        { token: 'number', foreground: 'd97706' },
      ],
      colors: {
        'editor.background': '#fafafa', // var(--bg-editor)
        'editor.foreground': '#111827', // var(--color-text)
        'editor.lineHighlightBackground': '#f3f4f6',
        'editorGutter.background': '#f3f4f6', // var(--bg-editor-gutter)
        'editorLineNumber.foreground': '#9ca3af', // var(--color-dim)
        'editorLineNumber.activeForeground': '#2563eb', // var(--primary)
      }
    });
    
    // Set active theme
    monaco.editor.setTheme('backy-light');

    if (language === 'typescript') {
      // Configure Typescript compilation/globals
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        lib: ['es2020'],
      });

      if (extraLibRef.current) {
        extraLibRef.current.dispose();
      }

      extraLibRef.current = monaco.languages.typescript.typescriptDefaults.addExtraLib(`
        declare const query: Record<string, any>;
        declare const body: Record<string, any>;
        declare const params: Record<string, any>;
        declare const db: any;
      `, 'global-vars.d.ts');
    }

    // Register Save command (Ctrl+S or Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) onSave();
    });
  };

  const options = {
    minimap: { enabled: false },
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
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
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--bg-editor)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        options={options}
        loading={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%', 
            color: 'var(--color-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px'
          }}>
            Initializing code editor...
          </div>
        }
      />
    </div>
  );
}
