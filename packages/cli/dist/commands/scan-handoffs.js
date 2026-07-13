import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../utils/config.js';
import { findFiles } from '../utils/fs.js';

                                      
              
                 
 

                                
             
                
                      
                   
               
                 
                 
                   
                   
                  
                        
                     
                     
                     
                   
    
 

                                     
                           
 

export async function scanHandoffs(options                     )                              {
  const config = await loadConfig(options.cwd);
  const files = (await findFiles(join(options.cwd, config.project.src_path), {
    extensions: config.project.extensions,
  })).map((file) => `${config.project.src_path.replace(/\/$/, '')}/${file}`);
  const records                  = [];
  const status = config.handoff?.status_on_create ?? config.handoff?.linear_status_on_create ?? 'Backlog';

  for (const filePath of files) {
    const source = await readFile(join(options.cwd, filePath), 'utf8');
    for (const call of findHandoffCalls(source)) {
      const fields = extractFields(call.body);
      const location = locationForOffset(source, call.offset);
      const title = fields.title ?? 'Untitled handoff';
      const description = fields.description ?? '';
      const id = fields.id ?? '';
      const errors = [
        ...(fields.id ? [] : ['missing id']),
        ...(fields.title ? [] : ['missing title']),
        ...(fields.description ? [] : ['missing description']),
      ];
      records.push({
        id,
        title,
        description,
        filePath,
        line: location.line,
        column: location.column,
        valid: errors.length === 0,
        errors,
        trackerPayload: {
          title,
          description,
          location: `${filePath}:${location.line}`,
          labels: ['handoff'],
          priority: fields.priority ?? 'normal',
          status,
        },
      });
    }
  }

  return { records };
}

export function formatScanHandoffsResult(result                    , json = false)         {
  if (json) return `${JSON.stringify(result, null, 2)}\n`;
  if (result.records.length === 0) return 'No handoffs found.\n';
  const lines = [`Found ${result.records.length} handoff(s):`];
  for (const record of result.records) {
    lines.push(`${record.filePath}:${record.line}:${record.column} ${record.title}`);
  }
  return `${lines.join('\n')}\n`;
}

function findHandoffCalls(source        )                                          {
  const calls                                          = [];
  const pattern = /\bhandoff\s*\(\s*\{/g;
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (!isCodeOffset(source, start)) continue;
    const braceStart = source.indexOf('{', start);
    const braceEnd = matchingBrace(source, braceStart);
    if (braceEnd === -1) {
      calls.push({ offset: start, body: '' });
      continue;
    }
    calls.push({ offset: start, body: source.slice(braceStart + 1, braceEnd) });
  }
  return calls;
}

function isCodeOffset(source        , offset        )          {
  let quote                = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < offset; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    const prev = source[index - 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (char === quote && prev !== '\\') quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
    } else if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
    } else if (char === '"' || char === "'" || char === '`') {
      quote = char;
    }
  }

  return !quote && !lineComment && !blockComment;
}

function matchingBrace(source        , start        )         {
  let depth = 0;
  let quote                = null;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const prev = source[index - 1];
    if (quote) {
      if (char === quote && prev !== '\\') quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function extractFields(body        )                         {
  const fields                         = {};
  const pattern = /\b(id|title|description|priority)\s*:\s*(['"`])([\s\S]*?)\2/g;
  for (const match of body.matchAll(pattern)) {
    fields[match[1]] = match[3].trim();
  }
  return fields;
}

function locationForOffset(source        , offset        )                                   {
  const before = source.slice(0, offset);
  const lines = before.split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}
