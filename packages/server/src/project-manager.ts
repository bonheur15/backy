import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';

export interface Endpoint {
  id: string;
  name: string;
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
  inputs: {
    query: { name: string; type: string; required?: boolean }[];
    body: { name: string; type: string; required?: boolean }[];
  };
  outputs: {
    response: { name: string; type: string; required?: boolean }[];
  };
  logic: string;
  position: { x: number; y: number };
  isAuthorized?: boolean;
}

export interface DBModel {
  id: string;
  name: string;
  columns: {
    name: string;
    type: 'integer' | 'text' | 'real';
    primaryKey?: boolean;
    autoIncrement?: boolean;
    notNull?: boolean;
    unique?: boolean;
    default?: string;
  }[];
  position: { x: number; y: number };
}

export interface LogicBlock {
  id: string;
  name: string;
  inputs: { name: string; type: string; required?: boolean }[];
  outputs: { name: string; type: string; required?: boolean }[];
  logic: string;
  position: { x: number; y: number };
  isFavorite?: boolean;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromPortName: string;
  toNodeId: string;
  toPortName: string;
}

export interface ProjectMetadata {
  endpoints: Endpoint[];
  dbModels: DBModel[];
  logicBlocks?: LogicBlock[];
  connections?: Connection[];
  gitAutoCommit?: boolean;
}

export class ProjectManager {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Initializes target project by copying template files if necessary
   */
  async initProject(): Promise<void> {
    if (!existsSync(this.projectPath)) {
      mkdirSync(this.projectPath, { recursive: true });
    }

    const packageJsonPath = join(this.projectPath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      console.log(`[Backy] Initializing new project at ${this.projectPath}...`);
      const templatePath = join(import.meta.dir, '../../template');

      // Copy template files recursively
      await this.copyDir(templatePath, this.projectPath);
      console.log(`[Backy] Project initialized successfully!`);
    }

    // Ensure .backy directory exists
    const backyDir = join(this.projectPath, '.backy');
    if (!existsSync(backyDir)) {
      mkdirSync(backyDir, { recursive: true });
    }

    // Ensure metadata.json exists
    const metadataPath = join(backyDir, 'metadata.json');
    if (!existsSync(metadataPath)) {
      const initialMetadata: ProjectMetadata = {
        endpoints: [
          {
            id: 'get_health',
            name: 'health',
            method: 'get',
            path: '/health',
            inputs: { query: [], body: [] },
            outputs: {
              response: [
                { name: 'status', type: 'string', required: true },
                { name: 'uptime', type: 'number', required: true }
              ]
            },
            logic: 'return {\n  status: "ok",\n  uptime: process.uptime()\n};',
            position: { x: 100, y: 150 }
          }
        ],
        dbModels: [
          {
            id: 'users',
            name: 'users',
            columns: [
              { name: 'id', type: 'integer', primaryKey: true, autoIncrement: true },
              { name: 'name', type: 'text', notNull: true },
              { name: 'email', type: 'text', notNull: true, unique: true },
              { name: 'createdAt', type: 'text', default: 'new Date().toISOString()' }
            ],
            position: { x: 500, y: 150 }
          }
        ],
        logicBlocks: [],
        gitAutoCommit: false
      };
      await Bun.write(metadataPath, JSON.stringify(initialMetadata, null, 2));
    }
  }

  private async copyDir(src: string, dest: string) {
    mkdirSync(dest, { recursive: true });
    const dir = Bun.file(src); // wait, Bun doesn't do dir listing with Bun.file directly.
    // Let's use standard fs readdir and copy files.
    const { readdirSync, statSync } = require('fs');
    const entries = readdirSync(src);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.backy') continue;
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      if (statSync(srcPath).isDirectory()) {
        await this.copyDir(srcPath, destPath);
      } else {
        const fileContent = await Bun.file(srcPath).text();
        await Bun.write(destPath, fileContent);
      }
    }
  }

  async getMetadata(): Promise<ProjectMetadata> {
    const metadataPath = join(this.projectPath, '.backy/metadata.json');
    if (!existsSync(metadataPath)) {
      await this.initProject();
    }
    const text = await Bun.file(metadataPath).text();
    return JSON.parse(text);
  }

  async saveMetadata(metadata: ProjectMetadata): Promise<void> {
    const metadataPath = join(this.projectPath, '.backy/metadata.json');
    await Bun.write(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Synchronizes an endpoint visually edited to the physical route file
   */
  async syncEndpoint(endpoint: Endpoint, metadata: ProjectMetadata): Promise<void> {
    const routeFilename = `${endpoint.method}_${endpoint.name}.ts`;
    const routesDir = join(this.projectPath, 'src/routes');
    if (!existsSync(routesDir)) {
      mkdirSync(routesDir, { recursive: true });
    }
    const routePath = join(routesDir, routeFilename);

    const querySchema = this.generateTypeBoxSchema(endpoint.inputs.query);
    const bodySchema = this.generateTypeBoxSchema(endpoint.inputs.body);
    const responseSchema = this.generateTypeBoxSchema(endpoint.outputs.response);

    let authLogic = '';
    if (endpoint.isAuthorized) {
      authLogic = `    // [BACKY_AUTH_START]
    const authHeader = headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Missing or invalid token');
    }
    const token = authHeader.split(' ')[1];
    const payload = await jwt.verify(token);
    if (!payload) {
      throw new Error('Unauthorized: Invalid token');
    }
    const user = payload; // Available in context
    // [BACKY_AUTH_END]`;
    }

    // Resolve chained logic blocks from visual connections
    const chainedLogic: string[] = [];
    const usedBlocks = new Set<string>();

    if (metadata.connections && metadata.logicBlocks) {
      // Find connections where 'fromNodeId' is this endpoint
      const outgoing = metadata.connections.filter(c => c.fromNodeId === endpoint.id);
      
      for (const conn of outgoing) {
        const targetBlock = metadata.logicBlocks.find(b => b.id === conn.toNodeId);
        if (targetBlock) {
          usedBlocks.add(targetBlock.name);
          
          // Map inputs from endpoint/request to block inputs
          // Simple implementation: pass 'body' and 'query' to blocks
          chainedLogic.push(`    // Chained Logic: ${targetBlock.name}`);
          chainedLogic.push(`    const result_${targetBlock.name} = await logic.${targetBlock.name}({ ...body, ...query });`);
        }
      }
    }

    const fileContent = `import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import * as schema from '../db/schema';
import * as logic from '../utils';

export const ${endpoint.method}_${endpoint.name} = new Elysia()
  .${endpoint.method}('${endpoint.path}', async ({ body, query, params, headers, jwt }) => {
${authLogic}
    // [BACKY_LOG_START]
    console.log('[Backy] Request:', { method: '${endpoint.method}', path: '${endpoint.path}', body, query });
    // [BACKY_LOG_END]

${chainedLogic.join('\n')}

    // [BACKY_LOGIC_START]
${endpoint.logic}
    // [BACKY_LOGIC_END]
  }, {
    // [BACKY_SCHEMA_START]
    query: ${querySchema},
    body: ${bodySchema},
    response: ${responseSchema}
    // [BACKY_SCHEMA_END]
  });
`;

    await Bun.write(routePath, fileContent);
    await this.syncIndexImports();
  }

  /**
   * Deletes an endpoint route file and cleans up imports in index.ts
   */
  async deleteEndpoint(endpointId: string, name: string, method: string): Promise<void> {
    const routeFilename = `${method}_${name}.ts`;
    const routePath = join(this.projectPath, 'src/routes', routeFilename);
    const { unlinkSync } = require('fs');
    if (existsSync(routePath)) {
      unlinkSync(routePath);
    }
    await this.syncIndexImports();
  }

  /**
   * Generates typebox schema string for routes
   */
  private generateTypeBoxSchema(fields: { name: string; type: string; required?: boolean }[]): string {
    if (!fields || fields.length === 0) {
      return 't.Object({})';
    }
    const lines = fields.map(f => {
      let tType = 't.String()';
      if (f.type === 'number') tType = 't.Number()';
      else if (f.type === 'boolean') tType = 't.Boolean()';
      else if (f.type === 'any') tType = 't.Any()';

      if (f.required === false) {
        tType = `t.Optional(${tType})`;
      }
      return `      ${f.name}: ${tType}`;
    });
    return `t.Object({\n${lines.join(',\n')}\n    })`;
  }

  /**
   * Re-generates src/index.ts based on physical routes files
   */
  async syncIndexImports(): Promise<void> {
    const indexFile = join(this.projectPath, 'src/index.ts');
    if (!existsSync(indexFile)) return;

    const routesDir = join(this.projectPath, 'src/routes');
    if (!existsSync(routesDir)) return;

    const { readdirSync } = require('fs');
    const files = readdirSync(routesDir).filter((f: string) => f.endsWith('.ts'));

    const imports: string[] = [];
    const useRoutes: string[] = [];

    for (const file of files) {
      const routeName = file.replace('.ts', '');
      imports.push(`import { ${routeName} } from './routes/${routeName}';`);
      useRoutes.push(`  .use(${routeName})`);
    }

    let indexContent = await Bun.file(indexFile).text();

    // Replace imports
    const importRegex = /\/\/ \[BACKY_IMPORTS_START\][\s\S]*?\/\/ \[BACKY_IMPORTS_END\]/;
    const newImportsStr = `// [BACKY_IMPORTS_START]\n${imports.join('\n')}\n// [BACKY_IMPORTS_END]`;
    indexContent = indexContent.replace(importRegex, newImportsStr);

    // Replace uses
    const routesRegex = /\/\/ \[BACKY_ROUTES_START\][\s\S]*?\/\/ \[BACKY_ROUTES_END\]/;
    const newRoutesStr = `// [BACKY_ROUTES_START]\n${useRoutes.join('\n')}\n  // [BACKY_ROUTES_END]`;
    indexContent = indexContent.replace(routesRegex, newRoutesStr);

    await Bun.write(indexFile, indexContent);
  }

  /**
   * Synchronizes visual logic blocks to src/utils/
   */
  async syncLogicBlocks(blocks: LogicBlock[], metadata: ProjectMetadata): Promise<void> {
    const utilsDir = join(this.projectPath, 'src/utils');
    if (!existsSync(utilsDir)) {
      mkdirSync(utilsDir, { recursive: true });
    }

    const indexExports: string[] = [];

    // Write each logic block to its own file
    for (const block of blocks) {
      const blockFilename = `${block.name}.ts`;
      const blockPath = join(utilsDir, blockFilename);

      // Generate input parameters signature
      const inputArgs = block.inputs.map(i => {
        let tsType = 'string';
        if (i.type === 'number') tsType = 'number';
        else if (i.type === 'boolean') tsType = 'boolean';
        else if (i.type === 'any') tsType = 'any';
        return `${i.name}${i.required === false ? '?' : ''}: ${tsType}`;
      }).join(', ');

      // Resolve chained calls (Logic Block -> Logic Block)
      const chainedLogic: string[] = [];
      if (metadata.connections) {
        const outgoing = metadata.connections.filter(c => c.fromNodeId === block.id);
        for (const conn of outgoing) {
          const target = blocks.find(b => b.id === conn.toNodeId);
          if (target) {
            chainedLogic.push(`  // Chained Logic: ${target.name}`);
            chainedLogic.push(`  const result_${target.name} = await ${target.name}({ ...args });`);
          }
        }
      }

      const fileContent = `import { db } from '../db/db';
import * as schema from '../db/schema';
import { ${blocks.map(b => b.name).filter(n => n !== block.name).join(', ')} } from './index';

export const ${block.name} = async (${inputArgs.length > 0 ? `args: { ${inputArgs} }` : ''}) => {
  const { ${block.inputs.map(i => i.name).join(', ')} } = ${inputArgs.length > 0 ? 'args' : '{}'};

  // [BACKY_CHAINED_START]
${chainedLogic.join('\n')}
  // [BACKY_CHAINED_END]

  // [BACKY_LOGIC_START]
${block.logic}
  // [BACKY_LOGIC_END]
};
`;
      await Bun.write(blockPath, fileContent);
      indexExports.push(`export * from './${block.name}';`);
    }

    // Write index.ts for utils
    const indexPath = join(utilsDir, 'index.ts');
    await Bun.write(indexPath, indexExports.join('\n') + '\n');
  }

  /**
   * Synchronizes visual database models to src/db/schema.ts
   */
  async syncDatabaseSchema(models: DBModel[]): Promise<void> {
    const schemaFile = join(this.projectPath, 'src/db/schema.ts');
    const dbDir = dirname(schemaFile);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    const tableDefs: string[] = [];

    for (const model of models) {
      const colDefs = model.columns.map(c => {
        let col = `${c.type}('${c.name}')`;
        if (c.primaryKey) {
          if (c.autoIncrement && c.type === 'integer') {
            col += `.primaryKey({ autoIncrement: true })`;
          } else {
            col += `.primaryKey()`;
          }
        } else {
          if (c.notNull) col += `.notNull()`;
          if (c.unique) col += `.unique()`;
          if (c.default !== undefined && c.default !== '') {
            if (c.default.startsWith('sql`')) {
              col += `.default(${c.default})`;
            } else if (c.default.includes('(') || c.default.includes('new ')) {
              col += `.default(${c.default})`;
            } else {
              col += `.default('${c.default}')`;
            }
          }
        }
        return `  ${c.name}: ${col}`;
      });

      tableDefs.push(`export const ${model.name} = sqliteTable('${model.name}', {\n${colDefs.join(',\n')}\n});`);
    }

    const schemaContent = `import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// [BACKY_SCHEMA_START]
${tableDefs.join('\n\n')}
// [BACKY_SCHEMA_END]
`;

    await Bun.write(schemaFile, schemaContent);
  }

  /**
   * Reads raw source file from project
   */
  async getFileContent(relativePath: string): Promise<string> {
    const path = join(this.projectPath, relativePath);
    if (!existsSync(path)) throw new Error('File not found');
    return await Bun.file(path).text();
  }

  /**
   * Writes raw source file to project
   */
  async writeFileContent(relativePath: string, content: string): Promise<void> {
    const path = join(this.projectPath, relativePath);
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    await Bun.write(path, content);
  }

  /**
   * Returns a list of files in the project
   */
  async listProjectFiles(): Promise<{ name: string; relativePath: string; isDir: boolean }[]> {
    const { readdirSync, statSync } = require('fs');
    const result: { name: string; relativePath: string; isDir: boolean }[] = [];

    const walk = (dir: string, base: string = '') => {
      const files = readdirSync(dir);
      for (const file of files) {
        if (file === 'node_modules' || file === '.backy' || file === '.git' || file === 'sqlite.db') continue;
        const fullPath = join(dir, file);
        const relPath = join(base, file);
        const isDir = statSync(fullPath).isDirectory();
        result.push({ name: file, relativePath: relPath, isDir });
        if (isDir) {
          walk(fullPath, relPath);
        }
      }
    };

    if (existsSync(this.projectPath)) {
      walk(this.projectPath);
    }
    return result;
  }
}
