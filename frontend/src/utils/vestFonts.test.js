import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VEST_FONT_HREF } from './vestFonts';

describe('vest font stylesheet', () => {
  it('matches the stylesheet the document shell can inject before paint', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html).toContain(VEST_FONT_HREF);
    expect(html).not.toContain('family=Anton');
  });
});
