# -*- coding: utf-8 -*-
"""合成 adaptive 图标预览（背景+前景），确认居中裁切效果"""
from PIL import Image

fg_path = r'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png'
bg_color = (247, 245, 240)  # #F7F5F0

fg = Image.open(fg_path).convert('RGBA')
canvas = Image.new('RGBA', fg.size, bg_color + (255,))
# 模拟系统缩放：foreground 以 108 画布上的安全区 66 呈现（实际系统会按 66/108 显示中心区域）
canvas.alpha_composite(fg)
canvas.convert('RGB').save('icon-preview.png', 'PNG')
print('preview saved:', canvas.size)
