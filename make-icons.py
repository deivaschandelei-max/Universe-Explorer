"""
Renders the app icons from icons/icon.svg with headless Chromium.

    python3 tools/make-icons.py

Outputs (in icons/):
  icon-192.png, icon-512.png   rounded, transparent corners (manifest "any")
  icon-maskable-512.png        full square; artwork stays inside the 80% safe zone
  apple-touch-icon.png         180x180 full square (iOS rounds the corners itself)
  favicon-32.png               32x32 rounded
"""
import pathlib
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
icons = root / "icons"
rounded = (icons / "icon.svg").read_text()
square = rounded.replace(' rx="112"', "")

JOBS = [
    ("icon-192.png", rounded, 192, True),
    ("icon-512.png", rounded, 512, True),
    ("icon-maskable-512.png", square, 512, False),
    ("apple-touch-icon.png", square, 180, False),
    ("favicon-32.png", rounded, 32, True),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    for name, svg, size, transparent in JOBS:
        page = browser.new_page(viewport={"width": size, "height": size}, device_scale_factor=1)
        page.set_content(
            "<!doctype html><style>html,body{margin:0;background:transparent}"
            "svg{display:block;width:%dpx;height:%dpx}</style>%s" % (size, size, svg)
        )
        page.screenshot(path=str(icons / name), omit_background=transparent)
        page.close()
        print("wrote", name)
    browser.close()
