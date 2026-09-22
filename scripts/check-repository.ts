import { execFileSync } from 'node:child_process';

execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' });
