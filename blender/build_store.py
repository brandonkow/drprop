"""Generate an explicit concept until an approved measured configuration is supplied."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, reset, materials, cube, cylinder, apothecary, area_light, configure, export
import bpy

args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
config = json.loads(Path(args[0] if args else ROOT / 'blender/store-config.json').read_text())
w, d, h = (float(config[key]) for key in ['widthMetres', 'depthMetres', 'heightMetres'])
if not 6 <= w <= 15 or not 8 <= d <= 20 or not 2.4 <= h <= 5:
    raise ValueError('Dimensions exceed the supported concept range.')
if config['consultationRooms'] != 2:
    raise ValueError('This layout currently supports two consultation rooms; redraw for another count.')
reset(); m = materials()
cube('Travertine floor', (w, d, .15), (0, 0, -.075), m['stone'])
cube('Limewash back wall', (w, .14, h), (0, d/2, h/2), m['wall'])
cube('Limewash left wall', (.14, d, h), (-w/2, 0, h/2), m['wall'])
cube('Low cutaway wall', (.14, d, .6), (w/2, 0, .3), m['wall'])
cube('Reception table', (2.4, .85, .1), (-1.7, -d/2+2, .8), m['wood'])
for x in [-2.7, -.7]:
    for y in [-d/2+1.7, -d/2+2.3]: cube('Reception leg', (.09, .09, .75), (x, y, .375), m['wood'])
apothecary(m, (-2.15, .9, 0))
for x in [1, 2.8]:
    cube('Linen lounge seat', (1.45, .82, .42), (x, -1.6, .45), m['linen'], .03)
    cube('Linen lounge back', (1.45, .16, .7), (x, -1.96, .8), m['linen'], .03)
cylinder('Coffee tabletop', .6, .09, (1.8, -.2, .5), m['wood'])
cylinder('Coffee table base', .18, .45, (1.8, -.2, .225), m['wood'])
for x in [-w/4, w/4]:
    cube('Privacy wall', (w/2-1, .1, 2.1), (x-.35, d/2-3.4, 1.05), m['wall'])
    cylinder('Consultation table', .65, .08, (x, d/2-1.65, .78), m['wood'])
    for dx in [-.9, .9]: cube('Consultation chair', (.5, .5, .5), (x+dx, d/2-1.65, .4), m['linen'])
    cube('Analysis screen', (.95, .05, .6), (x, d/2-.12, 1.5), m['night'])
cube('Room divider', (.12, 3.4, 2.4), (0, d/2-1.7, 1.2), m['wall'])
cube('Urgent booth back', (1.1, .12, 2.3), (w/2-.7, -d/2+1.2, 1.15), m['wood'])
cube('Urgent booth side', (.12, 1.1, 2.3), (w/2-1.25, -d/2+.65, 1.15), m['wood'])
area_light('Warm lounge pendant', (1.8, -.2, 2.8), 220, 1.3, (1.8, -.2, 0))
area_light('Daylight from frontage', (0, -d/2-2, 6), 1700, 7, (0, 1, 0), (1, .93, .8))
area_light('Consultation lights', (0, d/2-1.5, 2.8), 400, 3, (0, d/2-1.5, 0))
configure((w*1.02, -d*.94, h*2.05), (0, .6, .7))
bpy.context.scene['provenance'] = config['note']
export('store', 'store-concept.png')
(ROOT / 'brand/3d/store-provenance.json').write_text(json.dumps(config, indent=2)+'\n')
