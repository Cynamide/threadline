import { join } from 'node:path';

import { exists, firstExisting } from '../utils/fs.js';
import { readPackageManifest } from '../utils/package-json.js';

export async function detectFramework(cwd        )                              {
  const manifest = await readPackageManifest(cwd);
  const deps = manifest.dependencies;
  const scripts = manifest.scripts;
  const reasons           = [];
  const { value: srcPath, detected: srcPathDetected } = await detectSourceRoot(cwd);
  const { value: componentPath, detected: componentPathDetected } = await detectComponentPath(cwd, srcPath);

  if (deps.next || (await exists(join(cwd, 'next.config.js'))) || (await exists(join(cwd, 'next.config.ts')))) {
    reasons.push('found Next.js dependency or config');
    return detection('nextjs', resolveDevCommand(scripts), 3000, srcPath, srcPathDetected, componentPath, componentPathDetected, reasons);
  }

  if (deps.vite || (await exists(join(cwd, 'vite.config.js'))) || (await exists(join(cwd, 'vite.config.ts')))) {
    reasons.push('found Vite dependency or config');
    return detection('vite', resolveDevCommand(scripts), 5173, srcPath, srcPathDetected, componentPath, componentPathDetected, reasons);
  }

  if (deps['react-scripts']) {
    reasons.push('found react-scripts dependency');
    let devCommand = 'npm run dev';
    if (scripts.start) {
      devCommand = 'npm start';
    }
    return detection('cra', devCommand, 3000, srcPath, srcPathDetected, componentPath, componentPathDetected, reasons);
  }

  if (deps['@remix-run/react'] || deps['@remix-run/dev'] || (await exists(join(cwd, 'remix.config.js')))) {
    reasons.push('found Remix dependency or config');
    return detection('remix', resolveDevCommand(scripts), 3000, srcPath, srcPathDetected, componentPath, componentPathDetected, reasons);
  }

  reasons.push('no known framework markers found');
  return detection('custom', resolveDevCommand(scripts), 3000, srcPath, srcPathDetected, componentPath, componentPathDetected, reasons);
}

function detection(
  framework                                 ,
  devCommand        ,
  port        ,
  srcPath        ,
  srcPathDetected         ,
  componentPath        ,
  componentPathDetected         ,
  reasons          ,
)                     {
  let resolvedDevCommand = devCommand;
  if (!resolvedDevCommand.includes(' ')) {
    resolvedDevCommand = `npm run ${resolvedDevCommand}`;
  }

  return {
    framework,
    srcPath,
    srcPathDetected,
    componentPath,
    componentPathDetected,
    devCommand: resolvedDevCommand,
    port,
    reasons,
  };
}

async function detectSourceRoot(cwd        )                                                {
  const candidate = await firstExisting(cwd, ['src', 'app']);
  return {
    value: candidate ?? 'src',
    detected: candidate !== null,
  };
}

async function detectComponentPath(
  cwd        ,
  srcPath        ,
)                                                {
  const candidate = await firstExisting(cwd, [
    join(srcPath, 'components/ui'),
    join(srcPath, 'components'),
    join(srcPath, 'ui'),
  ]);

  if (!candidate) {
    return {
      value: 'components',
      detected: false,
    };
  }

  return {
    value: candidate.slice(srcPath.length + 1).replace(/\\/g, '/'),
    detected: true,
  };
}

function resolveDevCommand(scripts                        )         {
  if (scripts.dev) {
    return scripts.dev;
  }
  return 'npm run dev';
}
