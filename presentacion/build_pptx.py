"""Genera la presentación EcoMotion (widescreen 16:9)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parent
MEDIA = ROOT / "media"
OUT = ROOT / "EcoMotion_presentacion.pptx"

NAVY = RGBColor(0x0B, 0x1F, 0x33)
NAVY2 = RGBColor(0x12, 0x32, 0x4C)
TEAL = RGBColor(0x1F, 0xA7, 0xA0)
TEAL_DK = RGBColor(0x0E, 0x6E, 0x6A)
ORANGE = RGBColor(0xE0, 0x7A, 0x3D)
CREAM = RGBColor(0xF4, 0xF1, 0xEA)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MUTED = RGBColor(0x6B, 0x7A, 0x88)
INK = RGBColor(0x1A, 0x2A, 0x38)
RED = RGBColor(0xC4, 0x48, 0x3D)
GREEN = RGBColor(0x2E, 0x8C, 0x5A)

W, H = Inches(13.333), Inches(7.5)


def set_run(run, text, size=18, bold=False, color=INK, font="Calibri"):
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font


def add_textbox(slide, l, t, w, h, text, size=18, bold=False, color=INK, align=PP_ALIGN.LEFT, font="Calibri", anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    try:
        tf._txBody.bodyPr.set("anchor", {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[anchor])
    except Exception:
        pass
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    set_run(run, text, size, bold, color, font)
    return box


def fill_shape(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def rect(slide, l, t, w, h, color):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    fill_shape(s, color)
    return s


def round_rect(slide, l, t, w, h, color):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    fill_shape(s, color)
    return s


def footer(slide, page, total=14, light=False):
    c = MUTED if light else RGBColor(0x9A, 0xB0, 0xC0)
    add_textbox(slide, Inches(0.5), Inches(7.15), Inches(9), Inches(0.28), "EcoMotion  ·  Nuevo León  ·  Evaluación independiente con criterio de salud", size=11, color=c)
    add_textbox(slide, Inches(11.4), Inches(7.15), Inches(1.4), Inches(0.28), f"{page} / {total}", size=11, color=c, align=PP_ALIGN.RIGHT)


def accent_bar(slide, color=TEAL):
    rect(slide, Inches(0), Inches(0), W, Inches(0.08), color)


def overlay_crowd(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    draw = ImageDraw.Draw(im, "RGBA") if False else ImageDraw.Draw(im)

    def font(sz):
        for name in ("consola.ttf", "Consolas.ttf", "arial.ttf", "Arial.ttf"):
            try:
                return ImageFont.truetype(name, sz)
            except OSError:
                continue
        return ImageFont.load_default()

    f_hud = font(max(22, w // 55))
    f_small = font(max(16, w // 80))
    green = (40, 220, 90)
    blue = (40, 130, 255)
    yellow = (240, 200, 50)
    orange = (255, 150, 40)

    # Vehicles (road band ~ y 0.20–0.38)
    vehicles = [
        (0.255, 0.205, 0.355, 0.275, "VEHICLE 91%"),
        (0.318, 0.248, 0.365, 0.285, "VEHICLE 88%"),
        (0.375, 0.255, 0.430, 0.292, "VEHICLE 86%"),
        (0.455, 0.268, 0.515, 0.310, "VEHICLE 90%"),
        (0.525, 0.248, 0.645, 0.325, "VEHICLE 94%"),
    ]
    # People boxes (plaza) — sample, not every person
    people = [
        (0.015, 0.78, 0.07, 0.97),
        (0.09, 0.70, 0.135, 0.88),
        (0.145, 0.72, 0.19, 0.90),
        (0.20, 0.68, 0.245, 0.86),
        (0.255, 0.62, 0.30, 0.80),
        (0.33, 0.74, 0.375, 0.93),
        (0.39, 0.70, 0.435, 0.90),
        (0.445, 0.76, 0.49, 0.96),
        (0.50, 0.68, 0.545, 0.88),
        (0.56, 0.78, 0.605, 0.97),
        (0.63, 0.72, 0.675, 0.91),
        (0.70, 0.76, 0.745, 0.95),
        (0.78, 0.70, 0.825, 0.90),
        (0.86, 0.74, 0.905, 0.93),
        (0.42, 0.48, 0.46, 0.62),
        (0.50, 0.45, 0.54, 0.60),
        (0.28, 0.40, 0.318, 0.54),
        (0.60, 0.42, 0.64, 0.56),
        (0.72, 0.50, 0.76, 0.64),
        (0.18, 0.42, 0.22, 0.56),
    ]

    def box(x0, y0, x1, y1, color, label=None, width=3):
        a = (int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h))
        draw.rectangle(a, outline=color, width=width)
        if label:
            tw = draw.textlength(label, font=f_small)
            pad = 4
            bx0, by0 = a[0], max(0, a[1] - 22)
            draw.rectangle((bx0, by0, bx0 + tw + pad * 2, by0 + 20), fill=color)
            draw.text((bx0 + pad, by0 + 2), label, fill=(10, 20, 30), font=f_small)

    for i, (x0, y0, x1, y1) in enumerate(people, 1):
        box(x0, y0, x1, y1, blue, f"PERSON {80 + (i * 3) % 18}%")
        # YuNet face crop inside body
        fx0 = x0 + (x1 - x0) * 0.18
        fy0 = y0 + (y1 - y0) * 0.02
        fx1 = x1 - (x1 - x0) * 0.18
        fy1 = y0 + (y1 - y0) * 0.38
        box(fx0, fy0, fx1, fy1, green, None, 2)

    for x0, y0, x1, y1, lab in vehicles:
        box(x0, y0, x1, y1, orange, lab, 3)

    # HUD
    hud = [
        "DETECTOR: YUNET READY",
        f"YOLO   people:{len(people)}  vehicles:{len(vehicles)}  cand:{len(people)+len(vehicles)}",
    ]
    draw.rectangle((18, 14, int(w * 0.55), 90), fill=(8, 18, 28))
    draw.text((28, 20), hud[0], fill=green, font=f_hud)
    draw.text((28, 52), hud[1], fill=green, font=f_hud)

    bar_h = 42
    draw.rectangle((0, h - bar_h, w, h), fill=(8, 18, 28))
    draw.text((24, h - 32), f"FPS: 24.1   |   PEOPLE: {len(people)}   |   VEHICLES: {len(vehicles)}   |   EcoMotion CAM 03 · Macroplaza", fill=green, font=f_small)
    im.save(dest, quality=90)


def bullets(slide, l, t, w, items, size=16, color=INK, gap=0.38):
    y = t
    for item in items:
        add_textbox(slide, l, y, Inches(0.22), Inches(0.32), "▸", size=size, color=TEAL, bold=True)
        add_textbox(slide, l + Inches(0.28), y, w - Inches(0.28), Inches(0.42) if len(item) < 90 else Inches(0.55), item, size=size, color=color)
        y += Inches(gap if len(item) < 90 else gap + 0.12)
    return y


def card(slide, l, t, w, h, title, body, tone=TEAL):
    round_rect(slide, l, t, w, h, WHITE)
    rect(slide, l, t, Inches(0.08), h, tone)
    add_textbox(slide, l + Inches(0.22), t + Inches(0.16), w - Inches(0.32), Inches(0.36), title, size=14, bold=True, color=tone)
    add_textbox(slide, l + Inches(0.22), t + Inches(0.50), w - Inches(0.32), h - Inches(0.62), body, size=13, color=INK)


def build():
    crowd_src = MEDIA / "dummy-multitud-camara.jpg"
    if not crowd_src.exists():
        crowd_src = MEDIA.parent.parent / "docs" / "assets" / "ecomotion-camara-multitud.jpg"
    overlay_path = MEDIA / "dummy-multitud-overlay.jpg"
    overlay_crowd(crowd_src, overlay_path)

    cam_real = MEDIA / "conteo-camara.png"
    if not cam_real.exists():
        cam_real = MEDIA.parent.parent / "docs" / "assets" / "detector-yunet-yolo.png"

    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    blank = prs.slide_layouts[6]
    total = 14

    # ----- 1 portada -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, NAVY)
    rect(s, 0, 0, Inches(0.18), H, TEAL)
    add_textbox(s, Inches(0.7), Inches(1.35), Inches(12), Inches(0.4), "NUEVO LEÓN  ·  SECTOR SALUD  ·  DATOS PÚBLICOS", size=14, bold=True, color=TEAL)
    add_textbox(s, Inches(0.7), Inches(1.85), Inches(12), Inches(1.4), "EcoMotion", size=54, bold=True, color=WHITE)
    add_textbox(
        s,
        Inches(0.7),
        Inches(3.25),
        Inches(11.5),
        Inches(1.3),
        "Web app estatal para evaluar SO₂, NO₂ y CO con criterio de salud,\ny el sistema de conteo por cámaras que mide cuánta gente y cuántos\nvehículos se exponen en cada hora.",
        size=22,
        color=CREAM,
    )
    round_rect(s, Inches(0.7), Inches(5.15), Inches(3.3), Inches(0.7), TEAL)
    add_textbox(s, Inches(0.7), Inches(5.22), Inches(3.3), Inches(0.55), "Conteo · YuNet + YOLO", size=16, bold=True, color=NAVY, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    round_rect(s, Inches(4.2), Inches(5.15), Inches(3.3), Inches(0.7), NAVY2)
    add_textbox(s, Inches(4.2), Inches(5.22), Inches(3.3), Inches(0.55), "Sentinel-5P + SIMA", size=16, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    round_rect(s, Inches(7.7), Inches(5.15), Inches(3.3), Inches(0.7), ORANGE)
    add_textbox(s, Inches(7.7), Inches(5.22), Inches(3.3), Inches(0.55), "Tendencia 5–8 años", size=16, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    add_textbox(s, Inches(0.7), Inches(6.55), Inches(11), Inches(0.35), "Presentación del prototipo  ·  octubre 2026", size=14, color=MUTED)
    footer(s, 1, total)

    # ----- 2 agenda -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, CREAM)
    accent_bar(s)
    add_textbox(s, Inches(0.6), Inches(0.3), Inches(12), Inches(0.5), "Agenda", size=32, bold=True, color=NAVY)
    items = [
        ("01", "El problema", "Calidad del aire en NL y por qué el promedio diario no basta para salud."),
        ("02", "La web app", "Dictamen autónomo de SO₂, NO₂ y CO con Sentinel-5P y la red SIMA."),
        ("03", "Sistema de conteo", "Cámaras: YuNet + YOLO para personas y vehículos en tiempo real."),
        ("04", "Exposición", "Cruzar aforo horario con el índice AIRE y SALUD de cada estación."),
        ("05", "Alcance y siguiente paso", "Solo estatal. Complementa al visor SIMA, no lo sustituye."),
    ]
    for i, (n, title, body) in enumerate(items):
        y = Inches(1.05 + i * 1.1)
        round_rect(s, Inches(0.6), y, Inches(12.1), Inches(0.95), WHITE)
        add_textbox(s, Inches(0.85), y + Inches(0.18), Inches(1.1), Inches(0.6), n, size=26, bold=True, color=TEAL)
        add_textbox(s, Inches(2.1), y + Inches(0.12), Inches(10), Inches(0.4), title, size=20, bold=True, color=NAVY)
        add_textbox(s, Inches(2.1), y + Inches(0.48), Inches(10), Inches(0.38), body, size=14, color=MUTED)
    footer(s, 2, total, light=True)

    # ----- 3 problema -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, CREAM)
    accent_bar(s, ORANGE)
    add_textbox(s, Inches(0.6), Inches(0.28), Inches(12), Inches(0.4), "El problema", size=32, bold=True, color=NAVY)
    add_textbox(s, Inches(0.6), Inches(0.78), Inches(12), Inches(0.45), "Un mapa de colores del día no dice si se está protegiendo la salud, ni a cuánta gente le toca el aire malo.", size=16, color=INK)
    cards = [
        (TEAL, "Gases de interés", "Solo SO₂, NO₂ y CO. No ozono, no PM, no metano: el alcance es el de las verificaciones de contaminación de estos tres gases."),
        (ORANGE, "Exposición real", "El riesgo no es el pixel del satélite: es cuántas personas y vehículos están en la calle cuando el índice está en mala o peor."),
        (RED, "Gestión vs. salud", "Cumplir la NOM no equivale a cumplir la guía OMS 2021. El dictamen de EcoMotion prioriza el criterio sanitario."),
        (NAVY, "Solo Nuevo León", "Ni mundial ni nacional. AMM, corredor Cadereyta–Pesquería, occidente, norte y sur."),
    ]
    for i, (tone, title, body) in enumerate(cards):
        col, row = i % 2, i // 2
        card(s, Inches(0.6 + col * 6.3), Inches(1.45 + row * 2.45), Inches(6.0), Inches(2.25), title, body, tone)
    footer(s, 3, total, light=True)

    # ----- 4 web app -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, CREAM)
    accent_bar(s)
    add_textbox(s, Inches(0.6), Inches(0.28), Inches(12), Inches(0.45), "Qué es EcoMotion", size=32, bold=True, color=NAVY)
    add_textbox(s, Inches(0.6), Inches(0.8), Inches(12), Inches(0.5), "Una web app que lee datos públicos y emite un veredicto de gestión: adecuada, parcial o insuficiente para el sector salud.", size=16, color=INK)
    points = [
        "Tendencia OLS y Mann–Kendall / Sen en ventanas de 5 años y de la serie Sentinel-5P (~7–8 años; el satélite opera desde 2018, no se inventan 10 años de órbita).",
        "Recorte geográfico estricto al polígono de Nuevo León. El promedio estatal se pondera por población.",
        "Comparación simultánea contra OMS 2021 y NOM-021 / 022 / 023-SSA1.",
        "Complemento del visor estatal SIMA (aire.nl.gob.mx), no un duplicado cosmética del mapa.",
        "Módulo de exposición: aforos de cámaras × índice AIRE y SALUD hora por hora.",
    ]
    bullets(s, Inches(0.6), Inches(1.45), Inches(12.1), points, size=16, gap=0.72)
    footer(s, 4, total, light=True)

    # ----- 5 datos -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, CREAM)
    accent_bar(s)
    add_textbox(s, Inches(0.6), Inches(0.28), Inches(12), Inches(0.45), "Dos capas de evidencia, mismo estado", size=30, bold=True, color=NAVY)
    # left column satellite
    round_rect(s, Inches(0.5), Inches(1.05), Inches(6.05), Inches(5.7), WHITE)
    rect(s, Inches(0.5), Inches(1.05), Inches(6.05), Inches(0.7), NAVY)
    add_textbox(s, Inches(0.7), Inches(1.18), Inches(5.7), Inches(0.45), "Satélite  ·  Sentinel-5P TROPOMI", size=18, bold=True, color=WHITE)
    sat_items = [
        "Fuente: catálogo Google Earth Engine, solo productos de contaminación.",
        "NO₂  COPERNICUS/S5P/OFFL/L3_NO2  — columna troposférica.",
        "SO₂  COPERNICUS/S5P/OFFL/L3_SO2  — columna de SO₂.",
        "CO   COPERNICUS/S5P/OFFL/L3_CO   — columna de CO.",
        "Independiente de la red terrestre. Sirve para ver si el patrón de superficie es un artefacto de cobertura.",
        "Verificación horaria del feed; OFFL tarda días, NRTI ~3 h.",
    ]
    bullets(s, Inches(0.75), Inches(1.95), Inches(5.55), sat_items, size=14, gap=0.55)
    # right SIMA
    round_rect(s, Inches(6.75), Inches(1.05), Inches(6.05), Inches(5.7), WHITE)
    rect(s, Inches(6.75), Inches(1.05), Inches(6.05), Inches(0.7), TEAL)
    add_textbox(s, Inches(6.95), Inches(1.18), Inches(5.7), Inches(0.45), "Superficie  ·  red SIMA NL", size=18, bold=True, color=WHITE)
    sima_items = [
        "Valores de la Dirección de Gestión de Calidad del Aire del Estado.",
        "Escala oficial AIRE y SALUD: Buena → Extremadamente mala.",
        "Una región toma el peor índice de sus estaciones (criterio precautorio).",
        "Los 10 años de superficie, si se requieren, salen de SIMA / INECC, no del satélite.",
        "Complemento directo del mapa SIMA Bing / ICARS.",
        "Feed horario para cruzar con el conteo de cámaras.",
    ]
    bullets(s, Inches(7.0), Inches(1.95), Inches(5.55), sima_items, size=14, gap=0.55)
    footer(s, 5, total, light=True)

    # ----- 6 stats -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, CREAM)
    accent_bar(s)
    add_textbox(s, Inches(0.6), Inches(0.28), Inches(12), Inches(0.45), "Análisis estadístico de línea de tendencia", size=28, bold=True, color=NAVY)
    add_textbox(s, Inches(0.6), Inches(0.82), Inches(12), Inches(0.4), "No basta “se ve más verde”. Se prueba si la serie baja de forma sostenida.", size=16, color=INK)
    methods = [
        ("OLS", "Regresión lineal sobre la serie desestacionalizada. Pendiente, % de cambio en la ventana y R²."),
        ("Mann–Kendall", "Prueba no paramétrica de tendencia. Reporta alza / baja / estable y p-valor."),
        ("Sen", "Pendiente robusta (unidades/año). Menos sensible a un mes extremo."),
        ("Ventanas", "5 años (gestión reciente) y serie completa S5P (~2019–2026). El usuario recorta el rango."),
    ]
    for i, (title, body) in enumerate(methods):
        x = Inches(0.5 + (i % 4) * 3.2)
        y = Inches(1.4)
        round_rect(s, x, y, Inches(3.05), Inches(2.55), WHITE)
        add_textbox(s, x + Inches(0.18), y + Inches(0.2), Inches(2.7), Inches(0.45), title, size=18, bold=True, color=TEAL)
        add_textbox(s, x + Inches(0.18), y + Inches(0.7), Inches(2.7), Inches(1.65), body, size=14, color=INK)
    round_rect(s, Inches(0.5), Inches(4.2), Inches(12.3), Inches(2.35), WHITE)
    add_textbox(s, Inches(0.75), Inches(4.4), Inches(12), Inches(0.4), "Dictamen autónomo", size=18, bold=True, color=NAVY)
    add_textbox(
        s,
        Inches(0.75),
        Inches(4.85),
        Inches(11.8),
        Inches(1.45),
        "Si el gas incumple salud y la tendencia no baja con significancia, la gestión se marca insuficiente.\n"
        "Si baja y se acerca a protección sanitaria: adecuada, con la advertencia de no declarar el problema cerrado.\n"
        "Si satélite y superficie divergen, el sistema lo dice: no se esconde detrás de un solo promedio.",
        size=15,
        color=INK,
    )
    footer(s, 6, total, light=True)

    # ----- 7 salud -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, CREAM)
    accent_bar(s, RED)
    add_textbox(s, Inches(0.6), Inches(0.28), Inches(12), Inches(0.45), "Énfasis en el sector salud", size=30, bold=True, color=NAVY)
    table_h = [
        ("Gas", "Por qué importa", "OMS 2021", "NOM (SSA1)"),
        ("NO₂", "Asma, EPOC, IRAs. Niños, adultos mayores, trabajadores al aire libre.", "10 µg/m³ anual", "0.021 ppm anual (~40 µg/m³)"),
        ("SO₂", "Irritación respiratoria; pico histórico en corredor industrial / refinación.", "40 µg/m³ (24 h)", "NOM-022: 0.075 ppm p99 / 0.040 ppm 24 h"),
        ("CO", "Carboxihemoglobina. Riesgo cardiovascular, gestantes, cardiopatía.", "4 mg/m³ (24 h)", "NOM-021: 26 ppm 1 h / 9 ppm 8 h"),
    ]
    col_w = [Inches(1.3), Inches(5.3), Inches(2.5), Inches(3.15)]
    x0 = Inches(0.5)
    y0 = Inches(1.05)
    row_h = Inches(1.05)
    for r, row in enumerate(table_h):
        x = x0
        for c, cell in enumerate(row):
            bg = NAVY if r == 0 else (WHITE if r % 2 else RGBColor(0xE8, 0xEE, 0xF2))
            fg = WHITE if r == 0 else INK
            rect(s, x, y0 + r * row_h, col_w[c], row_h, bg)
            add_textbox(s, x + Inches(0.1), y0 + r * row_h + Inches(0.18), col_w[c] - Inches(0.18), row_h - Inches(0.25), cell, size=12 if r else 13, bold=(r == 0 or c == 0), color=fg)
            x += col_w[c]
    add_textbox(
        s,
        Inches(0.6),
        Inches(5.5),
        Inches(12.1),
        Inches(1.2),
        "La NOM es el piso legal mexicano. La OMS es el piso sanitario. EcoMotion muestra ambos y no deja que “estamos en norma” se lea como “es seguro para la población”.",
        size=16,
        color=INK,
    )
    footer(s, 7, total, light=True)

    # ----- 8 CONTEO HERO -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, NAVY)
    rect(s, 0, 0, W, Inches(0.08), ORANGE)
    add_textbox(s, Inches(0.6), Inches(0.35), Inches(12), Inches(0.35), "PIEZA CENTRAL DEL SISTEMA", size=13, bold=True, color=ORANGE)
    add_textbox(s, Inches(0.6), Inches(0.7), Inches(12), Inches(0.7), "Conteo de personas y vehículos por cámaras", size=32, bold=True, color=WHITE)
    add_textbox(
        s,
        Inches(0.6),
        Inches(1.45),
        Inches(12),
        Inches(0.7),
        "Visión por computadora en el punto de paso: no es un sensor de tráfico genérico,\nes el ojo que alimenta la exposición a contaminación.",
        size=18,
        color=CREAM,
    )
    feats = [
        ("YuNet", "Detector de rostros siempre en READY. Identifica cabezas y da un recuento estable en interior y plaza."),
        ("YOLO", "Detecta cuerpo completo de persona y clases de vehículo. Reporta people / vehicles / candidatos."),
        ("HUD en vivo", "FPS, cajas, confianza (%). El operador ve el mismo overlay que queda en evidencia."),
        ("Hacia EcoMotion", "Cada hora se publica cuántos pasos hubo. Eso se cruza con SIMA. Ahí nace “personas expuestas”."),
    ]
    for i, (title, body) in enumerate(feats):
        x = Inches(0.55 + (i % 2) * 6.35)
        y = Inches(2.35 + (i // 2) * 2.1)
        round_rect(s, x, y, Inches(6.1), Inches(1.9), NAVY2)
        add_textbox(s, x + Inches(0.25), y + Inches(0.2), Inches(5.6), Inches(0.4), title, size=18, bold=True, color=TEAL)
        add_textbox(s, x + Inches(0.25), y + Inches(0.65), Inches(5.6), Inches(1.05), body, size=14, color=CREAM)
    footer(s, 8, total)

    # ----- 9 captura real -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, CREAM)
    accent_bar(s, TEAL)
    add_textbox(s, Inches(0.45), Inches(0.22), Inches(12.4), Inches(0.4), "El sistema en operación  ·  captura real", size=26, bold=True, color=NAVY)
    add_textbox(s, Inches(0.45), Inches(0.62), Inches(12.4), Inches(0.35), "YuNet listo + YOLO: personas localizadas, vehículos en cero en este interior, 21 FPS.", size=14, color=MUTED)
    s.shapes.add_picture(str(cam_real), Inches(0.4), Inches(1.05), Inches(8.6), Inches(5.75))
    round_rect(s, Inches(9.2), Inches(1.05), Inches(3.7), Inches(5.75), WHITE)
    add_textbox(s, Inches(9.4), Inches(1.25), Inches(3.35), Inches(0.4), "Qué se lee en el frame", size=14, bold=True, color=TEAL)
    notes = [
        "DETECTOR: YUNET READY",
        "YOLO people: 2  vehicles: 0",
        "Caja azul = persona",
        "Caja verde = rostro (YuNet)",
        "Etiqueta PERSON + % de confianza",
        "Barra: FPS 21.0 | PEOPLE 2 | VEHICLES 0",
        "Misma tubería que se despliega en plaza o avenida.",
    ]
    bullets(s, Inches(9.4), Inches(1.75), Inches(3.3), notes, size=12, gap=0.48)
    footer(s, 9, total, light=True)

    # ----- 10 dummy crowd -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, NAVY)
    accent_bar(s, TEAL)
    add_textbox(s, Inches(0.4), Inches(0.18), Inches(12.5), Inches(0.38), "Escena de ejemplo  ·  plaza / avenida  (imagen dummy de multitud)", size=20, bold=True, color=WHITE)
    add_textbox(s, Inches(0.4), Inches(0.52), Inches(12.5), Inches(0.32), "Misma lógica del detector: personas en plaza, vehículos en el arroyo. Relevancia = aforo masivo bajo contaminación.", size=13, color=CREAM)
    s.shapes.add_picture(str(overlay_path), Inches(0.35), Inches(0.92), Inches(12.65), Inches(5.85))
    footer(s, 10, total)

    # ----- 11 del frame al dato -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, CREAM)
    accent_bar(s)
    add_textbox(s, Inches(0.55), Inches(0.25), Inches(12), Inches(0.45), "Del frame al dato de salud", size=30, bold=True, color=NAVY)
    steps = [
        ("1", "Cámara", "El flujo de video entra al detector YuNet + YOLO en el borde (poste, interior, plaza)."),
        ("2", "Conteo", "Se agregan personas y vehículos por minuto y se cierran en un total horario."),
        ("3", "Feed", "Se publica aforos.json: sensor, hora local, people (y vehicles)."),
        ("4", "Cruce SIMA", "Esa hora se alinea con el índice AIRE y SALUD de la estación más cercana."),
        ("5", "Exposición", "EcoMotion reporta cuántos pasos ocurrieron con aire Aceptable / Mala / Muy mala."),
    ]
    for i, (n, title, body) in enumerate(steps):
        x = Inches(0.4 + i * 2.58)
        round_rect(s, x, Inches(1.05), Inches(2.42), Inches(3.55), WHITE)
        oval = s.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.85), Inches(1.25), Inches(0.7), Inches(0.7))
        fill_shape(oval, TEAL)
        add_textbox(s, x + Inches(0.85), Inches(1.32), Inches(0.7), Inches(0.55), n, size=20, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        add_textbox(s, x + Inches(0.12), Inches(2.1), Inches(2.18), Inches(0.45), title, size=16, bold=True, color=NAVY, align=PP_ALIGN.CENTER)
        add_textbox(s, x + Inches(0.12), Inches(2.55), Inches(2.18), Inches(1.8), body, size=12, color=INK, align=PP_ALIGN.CENTER)
        if i < 4:
            add_textbox(s, x + Inches(2.15), Inches(2.4), Inches(0.45), Inches(0.4), "→", size=22, bold=True, color=TEAL)
    round_rect(s, Inches(0.5), Inches(4.85), Inches(12.3), Inches(1.7), WHITE)
    add_textbox(s, Inches(0.75), Inches(5.0), Inches(12), Inches(0.35), "Contrato del dato (ejemplo)", size=14, bold=True, color=TEAL)
    add_textbox(
        s,
        Inches(0.75),
        Inches(5.35),
        Inches(12),
        Inches(1.0),
        '{ "sensor": "mty-macroplaza-01", "hour": "2026-10-14 19:00", "people": 1840, "vehicles": 126 }\n'
        "hour usa el mismo reloj que SIMA. Si no hay índice esa hora, el conteo se reporta como desconocido, nunca como “aire bueno”.",
        size=14,
        color=INK,
        font="Consolas",
    )
    footer(s, 11, total, light=True)

    # ----- 12 por qué importa -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, CREAM)
    accent_bar(s, ORANGE)
    add_textbox(s, Inches(0.55), Inches(0.25), Inches(12), Inches(0.45), "Por qué el conteo es la pieza de salud", size=28, bold=True, color=NAVY)
    add_textbox(s, Inches(0.55), Inches(0.8), Inches(12.2), Inches(0.5), "Sin cámaras, la contaminación es un mapa. Con cámaras, es una población concreta a una hora concreta.", size=16, color=INK)
    reasons = [
        ("Personas", "Niños a la salida de escuela, peatones en Macroplaza, trabajadores en andén. El umbral “Mala o peor” aplica a toda la población, no solo a grupos sensibles."),
        ("Vehículos", "El conteo vehicular no es vanity metric: es proxy de combustión en el mismo corredor que emite NO₂ y CO, y de ocupantes expuestos en congestionamiento."),
        ("Hora pico", "Un IMECA “aceptable” a las 03:00 no cancela un IMECA “mala” a las 18:00 con 20× más peatones. El cruce horario evita ese sesgo."),
        ("Gestión", "Permite preguntar: ¿las medidas (Hoy No Circula, industria, transporte) coinciden con las horas y lugares donde hay más gente en la calle?"),
    ]
    for i, (title, body) in enumerate(reasons):
        y = Inches(1.45 + i * 1.25)
        round_rect(s, Inches(0.5), y, Inches(12.3), Inches(1.12), WHITE)
        rect(s, Inches(0.5), y, Inches(0.12), Inches(1.12), ORANGE if i % 2 else TEAL)
        add_textbox(s, Inches(0.9), y + Inches(0.12), Inches(11.6), Inches(0.32), title, size=16, bold=True, color=NAVY)
        add_textbox(s, Inches(0.9), y + Inches(0.46), Inches(11.6), Inches(0.55), body, size=14, color=INK)
    footer(s, 12, total, light=True)

    # ----- 13 alcance -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, CREAM)
    accent_bar(s)
    add_textbox(s, Inches(0.55), Inches(0.25), Inches(12), Inches(0.45), "Alcance y honestidad del prototipo", size=28, bold=True, color=NAVY)
    left = [
        "Estatal: polígono de Nuevo León. AMM, Cadereyta–Pesquería, occidente, norte, sur.",
        "Complementa SIMA; no reemplaza su mapa operativo ni sus IMECA oficiales.",
        "Los sensores cuentan pasos, no personas únicas. Una persona puede sumar en varias horas o cámaras.",
        "Sentinel-5P no cubre 10 años. La app no finge órbitas anteriores a 2018.",
    ]
    right = [
        "Publicar aforos.json (o VITE_AFOROS_URL) desde las cámaras en campo.",
        "Dejar fetch_sima.py --hourly y el extractor S5P para verificación continua.",
        "Ampliar clases YOLO (camión, autobús) en corredores industriales.",
        "Auditoría de privacidad: el sistema cuenta; no almacena identidad ni recortes de rostro en la web app.",
    ]
    round_rect(s, Inches(0.5), Inches(1.0), Inches(6.05), Inches(5.5), WHITE)
    add_textbox(s, Inches(0.75), Inches(1.2), Inches(5.6), Inches(0.4), "Lo que ya queda claro", size=18, bold=True, color=TEAL)
    bullets(s, Inches(0.75), Inches(1.75), Inches(5.55), left, size=14, gap=0.78)
    round_rect(s, Inches(6.75), Inches(1.0), Inches(6.05), Inches(5.5), WHITE)
    add_textbox(s, Inches(7.0), Inches(1.2), Inches(5.6), Inches(0.4), "Siguiente paso", size=18, bold=True, color=ORANGE)
    bullets(s, Inches(7.0), Inches(1.75), Inches(5.55), right, size=14, gap=0.78)
    footer(s, 13, total, light=True)

    # ----- 14 cierre -----
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, NAVY)
    rect(s, 0, 0, Inches(0.18), H, TEAL)
    add_textbox(s, Inches(0.7), Inches(1.5), Inches(12), Inches(0.4), "EN UNA FRASE", size=14, bold=True, color=TEAL)
    add_textbox(
        s,
        Inches(0.7),
        Inches(2.0),
        Inches(12),
        Inches(2.2),
        "EcoMotion no pregunta de qué color salió el mapa hoy.\nPregunta si SO₂, NO₂ y CO bajan de verdad,\ny cuántas personas y vehículos estuvieron ahí cuando el aire no era seguro.",
        size=24,
        color=WHITE,
    )
    add_textbox(s, Inches(0.7), Inches(4.6), Inches(12), Inches(0.4), "Cámaras (YuNet + YOLO)  ·  SIMA  ·  Sentinel-5P  ·  OMS / NOM  ·  solo Nuevo León", size=16, color=CREAM)
    add_textbox(s, Inches(0.7), Inches(5.5), Inches(12), Inches(0.4), "Gracias", size=28, bold=True, color=TEAL)
    footer(s, 14, total)

    prs.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
