# Run this *inside* Character Creator 5 (Plugins > Python Scripts > Run Script...,
# or paste into its Python console) — it only works with RLPy (and the bundled
# Unity Pipeline Plugin), both of which exist inside the running app; it does
# nothing run as plain Python.
#
# Batch-exports the listed .ccProject files to FBX + <Name>.json + textures/, in
# the exact shape scripts/cc5/build.mjs expects, so the existing Blender pipeline
# (convert_cc5.py) can pick them up unchanged:
#   node scripts/cc5/build.mjs --character <name>   (after wiring the name into
#   build.mjs's CHARACTERS map and pointing CC5_SOURCE_DIR at its export folder).
#
# Plain RLPy.RFileIO.ExportFbxFile (even with EExportFbxOptions3_ExportJson) writes
# a *different* JSON — CC5's avatar/expression-preset data, not the per-mesh
# material/texture manifest convert_cc5.py needs. That manifest only comes from
# the bundled "Unity Pipeline Plugin" (Bin64/OpenPlugin/Unity Pipeline Plugin),
# the same one that produced the original working HUMAN.json/WOMAN.json — so this
# drives that plugin's own Exporter class headlessly (no_window=True) instead.
#
# Nothing here is installed as a plugin and nothing auto-runs later; it exports
# once, when you run it, and only writes new files under OUT_ROOT. Your .ccProject
# files are only read, never changed.
import os
import sys

import RLPy

PLUGIN_DIR = r"C:\Users\kolak\Character Creator 5\Bin64\OpenPlugin\Unity Pipeline Plugin"
if PLUGIN_DIR not in sys.path:
    sys.path.insert(0, PLUGIN_DIR)
from utp import exporter as utp_exporter  # noqa: E402 (path must be set first)

SOURCE_DIR = r"C:\Users\kolak\Downloads\CHARACTER"
OUT_ROOT = r"C:\Users\kolak\Downloads\CHARACTER\export"
LOG_PATH = os.path.join(OUT_ROOT, "export_log.txt")

# name -> (project file, export motion?)
# Plain poses verified working (2026-11-15). Now adding: the Clothed variants (full
# character + outfit meshes/materials, export_motion=False) and Ariana's CATWALK/IDLE
# motion captures (skeleton + animation only, no mesh/materials -- export_motion=True,
# which drives utp's export_motion_fbx() and writes "<Name>_Motion.fbx", no JSON).
# Also exporting three unidentified .ccProject files found alongside the known ones
# (Avatar(13).ccProject, "Avatar(13) 1.ccProject", HD NEURAL.ccProject) purely to see
# what avatar/mesh names they contain -- not yet known if these are new characters,
# alternate saves of an existing one, or something else.
JOBS = {
    "Ariana": ("_HD Ariana.ccProject", False),
    "Aaron": ("_HD Aaron.ccProject", False),
    "NeutralF": ("_HD Neutral F.ccProject", False),
    "NeutralM": ("_HD Neutral M.ccProject", False),
    "AaronClothed": ("_HD Aaron_Clothed.ccProject", False),
    "ArianaClothed": ("_HD Ariana_Clothed.ccProject", False),
    "ArianaCatwalk": (os.path.join("_HD Ariana CATWALK", "_HD Ariana CATWALK.ccProject"), True),
    "ArianaIdle": (os.path.join("_HD Ariana IDLE", "_HD Ariana IDLE.ccProject"), True),
    "Avatar13": ("Avatar(13).ccProject", False),
    "Avatar13b": ("Avatar(13) 1.ccProject", False),
    "HDNeural": ("HD NEURAL.ccProject", False),
}


def log(fh, msg):
    print(msg)
    fh.write(msg + "\n")
    fh.flush()


def export_one(fh, name, project_file, export_motion):
    project_path = os.path.join(SOURCE_DIR, project_file)
    out_dir = os.path.join(OUT_ROOT, name)
    os.makedirs(out_dir, exist_ok=True)
    fbx_path = os.path.join(out_dir, f"{name}.fbx")

    log(fh, f"\n=== {name}: loading {project_path} ===")
    if not os.path.isfile(project_path):
        log(fh, f"SKIP: project file not found")
        return
    status = RLPy.RFileIO.LoadProject(project_path)
    log(fh, f"LoadProject status: {status}")

    avatars = RLPy.RScene.GetAvatars()
    if not avatars or len(avatars) == 0:
        log(fh, "FAIL: no avatar found in the loaded project")
        return
    avatar = avatars[0]
    log(fh, f"Found {len(avatars)} avatar(s); exporting avatars[0]")

    exp = utp_exporter.Exporter([avatar], no_window=True)
    exp.no_options = True  # skip fetch_options()/close_options_window(): no GUI widgets exist here
    exp.option_animation_only = export_motion
    exported = exp.do_export(fbx_path, no_base_folder=True)
    log(fh, f"Exporter.do_export returned: {exported}")
    json_path = os.path.splitext(fbx_path)[0] + ".json"
    log(fh, f"Expect: {fbx_path} and {json_path}")


def initialize_plugin():
    # Not auto-registered as a plugin; this name is just here so the same file
    # also works if pasted into a context that calls initialize_plugin().
    run_script()


def run_script():
    os.makedirs(OUT_ROOT, exist_ok=True)
    with open(LOG_PATH, "w", encoding="utf-8") as fh:
        log(fh, "AYE CC5 export starting")
        for name, (project_file, export_motion) in JOBS.items():
            try:
                export_one(fh, name, project_file, export_motion)
            except Exception as e:
                log(fh, f"ERROR on {name}: {e}")
        log(fh, "\nDone. Check each export/<Name>/ folder above.")


if __name__ == "__main__":
    run_script()
