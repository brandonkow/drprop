"""Generate the walnut refreshment cabinet and its studio render."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import reset, materials, cube, apothecary, area_light, configure, export
reset(); m = materials(); apothecary(m)
cube('Limewash backdrop', (6, .1, 4), (0, .5, 2), m['wall'])
cube('Travertine floor', (8, 8, .1), (0, 0, -.05), m['stone'])
area_light('Soft side daylight', (-3, -3, 4), 900, 4, (0, 0, .8), (1, .9, .75))
area_light('Warm fill', (3, -1, 3), 180, 2, (0, 0, 1))
configure((3.5, -5, 3), (0, 0, .8))
export('apothecary-blender', 'apothecary-concept.png')
