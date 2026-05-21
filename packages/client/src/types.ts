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
