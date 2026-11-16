# TASK 1 feasibility test (AYE Character Creator 2.0, Phase 1): can Character
# Creator 5 apply its own BUNDLED content to an avatar by script, well enough to
# export and convert through the existing pipeline? This is a one-shot, read-mostly
# probe, not a production tool -- it exists to answer that question honestly,
# including reporting exactly what fails.
#
# Run this *inside* Character Creator 5 (Plugins > Python Scripts > Run Script...).
# It does nothing run as plain Python (needs RLPy + the bundled Unity Pipeline
# Plugin, both only available inside the running app).
#
# What it does, in order, logging every step and continuing past failures:
#   1. Loads _HD Neutral F.ccProject (never saved back -- Neutral F is the
#      correct mannequin for this: bald, underwear only, nothing to clip against).
#   2. Tries RIAvatar.LoadAccessoryWithTransferSkinWeight() with a bundled
#      accessory (Accessory/Head/CC3/Beret.ccAcc).
#   3. Tries RFileIO.LoadObject() with a bundled cloth template
#      (Cloth/Full-body/CC3/Dress_A.ccCloth), then inspects what came back and
#      whether it needs a separate attach/fit step.
#   4. Whatever the avatar looks like after steps 2-3 (new content worn, or not),
#      exports it with the same Unity Pipeline Plugin exporter already proven for
#      Aaron/Ariana/Neutral, to a *separate* test output folder.
#   5. Leaves the bundled source files untouched -- read-only access throughout.
#
# Nothing here is installed as a plugin and nothing auto-runs later.
import os
import sys
import traceback

import RLPy

PLUGIN_DIR = r"C:\Users\kolak\Character Creator 5\Bin64\OpenPlugin\Unity Pipeline Plugin"
if PLUGIN_DIR not in sys.path:
    sys.path.insert(0, PLUGIN_DIR)
from utp import exporter as utp_exporter  # noqa: E402 (path must be set first)

SOURCE_DIR = r"C:\Users\kolak\Downloads\CHARACTER"
PROJECT_FILE = "_HD Neutral F.ccProject"
TEMPLATES = r"C:\Users\Public\Documents\Reallusion\Reallusion Templates"
ACCESSORY_PATH = os.path.join(TEMPLATES, "Accessory", "Head", "CC3", "Beret.ccAcc")
CLOTH_PATH = os.path.join(TEMPLATES, "Cloth", "Full-body", "CC3", "Dress_A.ccCloth")

OUT_ROOT = r"C:\Users\kolak\Downloads\CHARACTER\test_automation"
LOG_PATH = os.path.join(OUT_ROOT, "test_log.txt")


def log(fh, msg):
    print(msg)
    fh.write(msg + "\n")
    fh.flush()


def try_step(fh, label, fn):
    """Runs one probe step; logs its result or exception, never raises."""
    log(fh, f"\n--- {label} ---")
    try:
        result = fn()
        log(fh, f"OK: {label} -> {result!r}")
        return result
    except Exception as e:
        log(fh, f"FAILED: {label}: {type(e).__name__}: {e}")
        log(fh, traceback.format_exc())
        return None


def describe_scene_objects(fh, label):
    """Lists cloth/accessory/prop objects in the scene, so new content (wherever it landed) is visible."""
    log(fh, f"\n--- cloth/accessory/prop objects ({label}) ---")
    try:
        mask = RLPy.EObjectType_Cloth | RLPy.EObjectType_Accessory | RLPy.EObjectType_Prop | RLPy.EObjectType_MDProp
        objs = RLPy.RScene.FindObjects(mask)
    except Exception as e:
        log(fh, f"  FindObjects failed: {e}")
        return
    if not objs:
        log(fh, "  (none)")
    for o in objs:
        try:
            log(fh, f"  {o.GetName()} :: {type(o).__name__}")
        except Exception as e:
            log(fh, f"  <object>: {e}")


def run():
    os.makedirs(OUT_ROOT, exist_ok=True)
    with open(LOG_PATH, "w", encoding="utf-8") as fh:
        log(fh, "AYE CC5 automation feasibility test starting")
        log(fh, f"Accessory source: {ACCESSORY_PATH} (exists: {os.path.isfile(ACCESSORY_PATH)})")
        log(fh, f"Cloth source: {CLOTH_PATH} (exists: {os.path.isfile(CLOTH_PATH)})")

        project_path = os.path.join(SOURCE_DIR, PROJECT_FILE)
        status = try_step(fh, "LoadProject", lambda: RLPy.RFileIO.LoadProject(project_path))
        if status is None:
            log(fh, "ABORT: could not load the test project")
            return

        avatars = RLPy.RScene.GetAvatars()
        if not avatars:
            log(fh, "ABORT: no avatar found in the loaded project")
            return
        avatar = avatars[0]
        log(fh, f"Avatar: {avatar.GetName()}")

        # --- TEST A: accessory, the most direct-looking API (an instance method
        # on the avatar itself, taking a file path straight away) ---
        for template_type in ["", "CC_Base_Body", "Standard"]:
            try_step(
                fh, f"LoadAccessoryWithTransferSkinWeight(template_type={template_type!r})",
                lambda tt=template_type: avatar.LoadAccessoryWithTransferSkinWeight(ACCESSORY_PATH, tt),
            )

        describe_scene_objects(fh, "after accessory attempts")

        # --- TEST B: cloth. LoadObject is the generic content loader; inspect what
        # type of object it returns and whether it already carries a TransferSkinWeight
        # method (RICloth-like) or needs a different attach step entirely ---
        cloth_obj = try_step(fh, "RFileIO.LoadObject(cloth)", lambda: RLPy.RFileIO.LoadObject(CLOTH_PATH))
        if cloth_obj is not None:
            log(fh, f"Loaded cloth object type: {type(cloth_obj).__name__}")
            has_transfer = hasattr(cloth_obj, "TransferSkinWeight")
            log(fh, f"Has TransferSkinWeight: {has_transfer}")
            if has_transfer:
                for template_type in ["", "CC_Base_Body", "Standard"]:
                    try_step(
                        fh, f"cloth.TransferSkinWeight(template_type={template_type!r})",
                        lambda tt=template_type: cloth_obj.TransferSkinWeight(tt),
                    )
            # Does the avatar now report this as one of its clothes?
            try_step(fh, "avatar.GetClothes() after LoadObject", lambda: [c.GetName() for c in avatar.GetClothes()])

        describe_scene_objects(fh, "after cloth attempts")

        # --- Export whatever the avatar looks like now, the same proven way,
        # so the result can be inspected and run through convert_cc5.py ---
        out_dir = os.path.join(OUT_ROOT, "NeutralF_automation_test")
        os.makedirs(out_dir, exist_ok=True)
        fbx_path = os.path.join(out_dir, "NeutralF_automation_test.fbx")
        exp = utp_exporter.Exporter([avatar], no_window=True)
        exp.no_options = True
        exp.option_animation_only = False
        exported = try_step(fh, "export", lambda: exp.do_export(fbx_path, no_base_folder=True))
        log(fh, f"Expect: {fbx_path} and {os.path.splitext(fbx_path)[0] + '.json'}")
        log(fh, f"\nDone. exported={exported}")


if __name__ == "__main__":
    run()
