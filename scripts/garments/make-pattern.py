"""Draft a GarmentCode sewing pattern from a design file and lay it out as a box mesh for
scripts/garments/drape-in-blender.py.

Run with GarmentCode on the path (Python 3.9, numpy<2; docs/GARMENT_PIPELINE.md):

  PYTHONPATH=<GarmentCode> python scripts/garments/make-pattern.py \
      scripts/garments/patterns/<garment>.json <out dir> [--resolution 2.5]

The design file names GarmentCode's design parameters that differ from its defaults
(assets/design_params/default.yaml), as "section.parameter": value. Writes
<out dir>/<name>/<name>_specification.json (the pattern), _boxmesh.obj, _orig_lens.pickle
(the sewn edge lengths) and _sim_segmentation.txt (which panel each vertex is on).
"""
import argparse
import json
import os
from pathlib import Path

import yaml

p = argparse.ArgumentParser()
p.add_argument('design')
p.add_argument('out')
p.add_argument('--resolution', type=float, default=2.5, help='cloth edge length in cm: 2.5 gives about 2,200 vertices for a dress')
o = p.parse_args()

gc = Path(os.environ.get('GARMENTCODE', '.'))
os.chdir(gc)  # GarmentCode reads its assets relative to its own folder
from assets.garment_programs.meta_garment import MetaGarment  # noqa: E402
from assets.bodies.body_params import BodyParameters  # noqa: E402
from pygarment.meshgen.boxmeshgen import BoxMesh  # noqa: E402
from pygarment.meshgen.sim_config import PathCofig  # noqa: E402

job = json.load(open(Path(o.design).resolve() if Path(o.design).is_absolute() else Path(os.environ['OLDPWD'] if 'OLDPWD' in os.environ else '.') / o.design))
design = yaml.safe_load(open('assets/design_params/default.yaml'))['design']
for key, value in job['design'].items():
    section, param = key.split('.')
    design[section][param]['v'] = value
body = BodyParameters(f"assets/bodies/{job['body']}.yaml")
garment = MetaGarment(job['name'], body, design)
pattern = garment.assembly()
if garment.is_self_intersecting():
    raise SystemExit(f"{job['name']}: the pattern's panels intersect; change the design")

draft = Path(o.out) / 'draft'
folder = pattern.serialize(draft, to_subfolder=True, with_3d=False, with_text=False, view_ids=False, with_printable=False)
body.save(folder)
spec = Path(folder) / f"{job['name']}_specification.json"
paths = PathCofig(in_element_path=spec.parent, out_path=o.out, in_name=job['name'], body_name=job['body'], default_body=True)
mesh = BoxMesh(paths.in_g_spec, o.resolution)
mesh.load()
mesh.serialize(paths, store_panels=False, uv_config={'seam_width': 0.5, 'dpi': 1500, 'fabric_grain_texture_path': None, 'fabric_grain_resolution': 1})
print(f'pattern: {spec}\nbox mesh: {Path(o.out) / job["name"]}')
