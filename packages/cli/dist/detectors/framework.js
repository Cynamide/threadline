import { join } from 'node:path';
                                                      
import { exists, readJson } from '../utils/fs.js';

                       
                                   
                                        
                                           
 

export async function detectFramework(cwd        )                              {
  const pkg = await readJson             (join(cwd, 'package.json'));
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  const scripts = pkg?.scripts ?? {};
  const reasons           = [];

  if (deps.next || (await exists(join(cwd, 'next.config.js'))) || (await exists(join(cwd, 'next.config.ts')))) {
    reasons.push('found Next.js dependency or config');
    return detection('nextjs', scripts.dev ?? 'npm run dev', 3000, reasons);
  }

  if (deps.vite || (await exists(join(cwd, 'vite.config.js'))) || (await exists(join(cwd, 'vite.config.ts')))) {
    reasons.push('found Vite dependency or config');
    return detection('vite', scripts.dev ?? 'npm run dev', 5173, reasons);
  }

  if (deps['react-scripts']) {
    reasons.push('found react-scripts dependency');
    return detection('cra', scripts.start ? 'npm start' : 'npm run dev', 3000, reasons);
  }

  if (deps['@remix-run/react'] || deps['@remix-run/dev'] || (await exists(join(cwd, 'remix.config.js')))) {
    reasons.push('found Remix dependency or config');
    return detection('remix', scripts.dev ?? 'npm run dev', 3000, reasons);
  }

  reasons.push('no known framework markers found');
  return detection('custom', scripts.dev ?? 'npm run dev', 3000, reasons);
}

function detection(
  framework                                 ,
  devCommand        ,
  port        ,
  reasons          ,
)                     {
  return {
    framework,
    srcPath: 'src',
    componentPath: 'components',
    devCommand: devCommand.includes(' ') ? devCommand : `npm run ${devCommand}`,
    port,
    reasons,
  };
}
