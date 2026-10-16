import sys, os
from PIL import Image, ImageOps
src, dst, prefix, color_size, detail_size = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
os.makedirs(dst, exist_ok=True)
for part in ('body', 'head'):
    c = Image.open(f'{src}/{prefix}_{part}_color.tga').convert('RGB').resize((color_size,)*2, Image.LANCZOS)
    c.save(f'{dst}/{part}_color.jpg', quality=88)
    n = Image.open(f'{src}/{prefix}_{part}_normal.tga').convert('RGB').resize((detail_size,)*2, Image.LANCZOS)
    n.save(f'{dst}/{part}_normal.jpg', quality=92)
    # Specular (white = shiny) -> glTF roughness in the G channel (black = smooth)
    sp = Image.open(f'{src}/{prefix}_{part}_specular.tga').convert('L').resize((detail_size,)*2, Image.LANCZOS)
    rough = sp.point(lambda v: int(255 * max(0.32, min(0.92, 0.92 - (v / 255) * 0.75))))
    orm = Image.merge('RGB', (Image.new('L', rough.size, 255), rough, Image.new('L', rough.size, 0)))
    orm.save(f'{dst}/{part}_orm.png')
# Eyelashes and similar cut-out cards keep their alpha channel
opacity = f'{src}/{prefix}_opacity_color.tga'
if os.path.exists(opacity):
    Image.open(opacity).convert('RGBA').save(f'{dst}/opacity_color.png')
print('ok', sorted(os.listdir(dst)))
