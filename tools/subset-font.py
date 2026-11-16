"""Trim Vazirmatn to what Persian pages need and copy it into every site.

  python tools/subset-font.py          # rebuild every <site>/fonts/Vazirmatn.woff2 from tools/font-src/
  python tools/subset-font.py --check  # fail (exit 1) if any character used on the sites is missing from the trimmed font

Keeps whole ranges (Basic Latin, Latin-1, the Arabic/Persian block, general punctuation, arrows, math)
so new Persian/English text keeps working, plus every character found in the sites' html/js/css.
Arabic presentation forms come along through GSUB closure (joining/ligatures still work).
Needs: pip install fonttools brotli
"""
import glob, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'font-src', 'Vazirmatn.woff2')
TARGETS = sorted(glob.glob(os.path.join(ROOT, '*', 'fonts', 'Vazirmatn.woff2')))
RANGES = [(0x20, 0x7E), (0xA0, 0xFF), (0x600, 0x6FF), (0x200B, 0x206F), (0x2190, 0x21FF), (0x2200, 0x22FF), (0x20AC, 0x20AC), (0x2122, 0x2122), (0x25CC, 0x25CC)]


def used_chars():
    chars = set()
    for ext in ('html', 'js', 'css'):
        for p in glob.glob(os.path.join(ROOT, '**', '*.' + ext), recursive=True):
            rel = os.path.relpath(p, ROOT).replace('\\', '/')
            if rel.startswith(('tools/', 'dev/', 'shots/', 'node_modules/')) or '/vendor/' in rel or '/dev-' in rel:
                continue
            chars |= {ord(c) for c in open(p, encoding='utf8', errors='ignore').read() if ord(c) >= 0x20}
    return chars


def wanted(cmap):
    keep = {c for a, b in RANGES for c in range(a, b + 1)}
    return sorted((keep | used_chars()) & set(cmap))


def build():
    src = TTFont(SRC)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.drop_tables = []
    s = subset.Subsetter(opts)
    s.populate(unicodes=wanted(src.getBestCmap()))
    s.subset(src)
    out = os.path.join(ROOT, 'tools', 'font-src', 'Vazirmatn.subset.woff2')
    subset.save_font(src, out, opts)
    data = open(out, 'rb').read()
    os.remove(out)
    for t in TARGETS:
        open(t, 'wb').write(data)
    print(f'{os.path.getsize(SRC)} -> {len(data)} bytes, written to {len(TARGETS)} sites')


def check():
    bad = 0
    full = set(TTFont(SRC).getBestCmap())
    need = used_chars()
    for t in TARGETS:
        have = set(TTFont(t).getBestCmap())
        missing = sorted(c for c in need if c in full and c not in have)
        if missing:
            bad += 1
            print('✗', os.path.relpath(t, ROOT), 'missing', ' '.join(f'U+{c:04X}({chr(c)})' for c in missing[:20]))
    if not bad:
        print(f'✓ all {len(need & full)} used characters present in {len(TARGETS)} fonts')
    return bad


if __name__ == '__main__':
    if '--check' not in sys.argv:
        build()
    sys.exit(1 if check() else 0)
