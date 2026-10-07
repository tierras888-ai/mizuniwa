"""Package the dependency-free application into a downloadable HTML file."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parent.parent
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'artifacts' / 'MIZUNIWA.html'
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
html = re.sub(r'<link rel="stylesheet" href="style.css"\s*/?>', lambda _: '<style>\n' + css + '\n</style>', html)

def inline_script(match):
    source = (root / match.group(1)).read_text()
    source = source.replace('</script', r'<\/script')
    return '<script>\n' + source + '\n</script>'

html = re.sub(r'<script src="([^"]+)"></script>', inline_script, html)
assert not re.search(r'<script[^>]+src=|<link[^>]+stylesheet', html)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(html)
print(f'{output}: {output.stat().st_size} bytes')
