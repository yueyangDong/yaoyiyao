# -*- coding: utf-8 -*-
"""生成 App 图标：居中裁切 → legacy 各密度 + adaptive foreground（安全区 66/108）"""
import os
from PIL import Image

SRC = r'.reasonix/attachments/clipboard-20260807-120808.559541-000001.png'
RES = r'android/app/src/main/res'

img = Image.open(SRC).convert('RGBA')
w, h = img.size
side = min(w, h)

def center_crop(image, size):
    """居中裁切为正方形再缩放"""
    w, h = image.size
    s = min(w, h)
    left = (w - s) // 2
    top = (h - s) // 2
    return image.crop((left, top, left + s, top + s)).resize((size, size), Image.LANCZOS)

def save_icon(image, folder, name):
    os.makedirs(folder, exist_ok=True)
    image.save(os.path.join(folder, name), 'PNG')
    print('OK:', os.path.join(folder, name))

# ===== 1. legacy 图标（API 25-）：整图居中裁切缩放 =====
# mdpi 48, hdpi 72, xhdpi 96, xxhdpi 144, xxxhdpi 192
LEGACY_SIZES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for density, size in LEGACY_SIZES.items():
    icon = center_crop(img, size)
    folder = os.path.join(RES, 'mipmap-' + density)
    save_icon(icon, folder, 'ic_launcher.png')
    save_icon(icon, folder, 'ic_launcher_round.png')

# ===== 2. adaptive foreground（API 26+）：安全区 66/108 = 61% =====
# mdpi 108, hdpi 162, xhdpi 216, xxhdpi 324, xxxhdpi 432
FOREGROUND_SIZES = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}
SAFE_RATIO = 66.0 / 108.0  # 0.6111

for density, size in FOREGROUND_SIZES.items():
    # 从源图中心取 SAFE_RATIO 区域，再缩放到画布尺寸（图案占满安全区）
    src_side = int(side * SAFE_RATIO)
    left = (w - src_side) // 2
    top = (h - src_side) // 2
    fg = img.crop((left, top, left + src_side, top + src_side)).resize((size, size), Image.LANCZOS)
    folder = os.path.join(RES, 'mipmap-' + density)
    save_icon(fg, folder, 'ic_launcher_foreground.png')

print('ALL DONE')
