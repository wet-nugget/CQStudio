import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['runner/build.mjs',...process.argv.slice(2)],{stdio:'inherit'});
