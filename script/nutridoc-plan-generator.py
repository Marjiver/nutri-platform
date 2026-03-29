"""
NutriDoc — Générateur de plans alimentaires
==========================================
Module réutilisable. Appeler generate_plan(config) avec un dict de configuration.

RÈGLES INTÉGRÉES (non modifiables) :
  - Tous les yaourts, compotes, produits laitiers = sans sucres ajoutés (mentionné automatiquement)
  - Produits laitiers (jamais "laitiers")
  - Sources de glucides (jamais "glucides" seul pour désigner les aliments)
  - 2 petits-suisses 0% MG = 12g de protéines (rappelé dans les astuces)
  - Pas de mention "répartir sur X prises"
  - Pas de mention "caséine lente"
  - Excès autorisés : 5–7% prise de masse / 2–3% sèche/perte de poids = 60–200 kcal selon objectif
  - Toujours variante végé sur déjeuner et dîner (⊛)
  - Astuce budget 💡 au moins 3 par plan
  - Mise en page : max 2 pages (profil + tableau | graphiques + conseils + signature)
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, HRFlowable, PageBreak)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.graphics.shapes import Drawing, String
from reportlab.graphics.charts.piecharts import Pie
import os

# ── Palette NutriDoc ──────────────────────────────────────────────────────────
C = lambda h: colors.HexColor(h)
DARK    = C('#0d2018'); GREEN   = C('#1D9E75'); GREEN_L = C('#E1F5EE')
GREEN_D = C('#0F6E56'); GRAY    = C('#6b7b74'); CREAM   = C('#f7f9f7')
BORDER  = C('#e8edeb'); AMBER   = C('#FAEEDA'); AMBER_D = C('#633806')
BLUE    = C('#0ea5e9'); RED_L   = C('#FCEBEB'); RED_D   = C('#A32D2D')
TEAL    = C('#5DCAA5'); TEAL_L  = C('#9FE1CB')
W, H    = A4

# ── Styles ────────────────────────────────────────────────────────────────────
def S(n, **k):
    d = dict(fontName='Helvetica', fontSize=8, textColor=DARK, leading=11, spaceAfter=0)
    d.update(k)
    return ParagraphStyle(n, **d)

# ── Header / Footer ──────────────────────────────────────────────────────────
def make_hf(diet_info, prescr_info=None):
    def hf(c, doc):
        c.saveState()
        # Header
        c.setFillColor(DARK); c.rect(0, H-1.3*cm, W, 1.3*cm, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont('Helvetica-Bold', 11)
        c.drawString(0.85*cm, H-0.82*cm, 'Nutri')
        c.setFillColor(GREEN)
        c.drawString(0.85*cm + c.stringWidth('Nutri','Helvetica-Bold',11), H-0.82*cm, 'Doc')
        c.setFillColor(C('#9FE1CB')); c.setFont('Helvetica', 6.8)
        c.drawString(3.0*cm, H-0.80*cm, 'Plan alimentaire personnalisé')
        c.setFillColor(GREEN); c.roundRect(W-4.3*cm, H-1.1*cm, 3.2*cm, 0.5*cm, 2*mm, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont('Helvetica-Bold', 6.5)
        c.drawCentredString(W-2.7*cm, H-0.80*cm, '✓ VALIDÉ RPPS')
        # Footer
        c.setFillColor(DARK); c.rect(0, 0, W, 0.72*cm, fill=1, stroke=0)
        c.setFillColor(GRAY); c.setFont('Helvetica', 5.8)
        footer = f"NutriDoc · {diet_info['nom']} · RPPS {diet_info['rpps']} · {diet_info['email']}"
        if prescr_info:
            footer += f"  |  Prescripteur : {prescr_info['nom']} ({prescr_info['profession']})"
        c.drawString(0.85*cm, 0.24*cm, footer)
        c.drawRightString(W-0.85*cm, 0.24*cm, f'Page {doc.page}')
        c.restoreState()
    return hf

# ── Cellule tableau ───────────────────────────────────────────────────────────
def cell(ex1, ex2=None, veg=None):
    items = [Paragraph(ex1, S('e1', fontSize=6.2, fontName='Helvetica-Bold', textColor=DARK, leading=9))]
    if ex2:
        items.append(Paragraph(ex2, S('e2', fontSize=5.8, fontName='Helvetica-Oblique', textColor=GRAY, leading=8.8)))
    if veg:
        items.append(Paragraph(f'<font color="#0F6E56">⊛</font> {veg}', S('v', fontSize=5.5, textColor=GRAY, leading=8.5)))
    return items

# ── Camembert ─────────────────────────────────────────────────────────────────
def make_pie(data, col_list, title, size=110):
    d = Drawing(size, size+10)
    pie = Pie()
    pie.x = size//2-32; pie.y = 11; pie.width = 64; pie.height = 64
    pie.data = data; pie.labels = None
    pie.slices.strokeWidth = 0.5; pie.slices.strokeColor = colors.white
    for i, col in enumerate(col_list):
        pie.slices[i].fillColor = col
    d.add(String(size//2, 2, title, textAnchor='middle',
                 fontName='Helvetica-Bold', fontSize=6, fillColor=DARK))
    d.add(pie)
    return d

def make_legend(items):
    rows = [[Paragraph(f'■ {l}', S('x', fontSize=5.8, textColor=DARK, leading=9))] for l in items]
    t = Table(rows, colWidths=[4.0*cm])
    t.setStyle(TableStyle([
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0.5),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
    ]))
    return t

# ══════════════════════════════════════════════════════════════════════════════
# FONCTION PRINCIPALE
# ══════════════════════════════════════════════════════════════════════════════
def generate_plan(config, output_path):
    """
    config = {
      'patient': {
        'prenom': str, 'nom': str, 'age': int, 'ville': str,
        'poids': float, 'taille': int,
        'objectif': str,          # 'prise_masse' | 'perte_poids' | 'seche' | 'equilibre' | 'performance'
        'activite': str,          # description
        'niveau_pratique': str,   # 'debutant' | 'intermediaire' | 'confirme' | None
        'budget': str,            # 'serre' | 'moyen' | 'confort'
        'restrictions': str,      # 'aucune' | 'vegetarien' | 'sans_gluten' | ...
        'notes': str,             # notes médicales libres
      },
      'nutrition': {
        'kcal_jour': int,
        'proteines_g': int,
        'glucides_sources_g': int,   # "sources de glucides" en grammes
        'lipides_g': int,
        'surplus_pct': float,        # % excès autorisé (5-7 prise masse, 2-3 sèche)
        'duree_semaines': int,
      },
      'repas': [
        {
          'nom': str,              # ex: 'Petit-déjeuner'
          'kcal': int,
          'couleur': str,          # hex color pour header
          'texte_sombre': bool,    # True = texte header dark (fond clair), False = texte blanc
          'jours': [               # 7 éléments (Lun à Dim)
            {
              'ex1': str,          # exemple principal (gras)
              'ex2': str,          # exemple alternatif (italique, optionnel)
              'veg': str,          # variante végé ⊛ (optionnel)
            }, ...
          ]
        }, ...
      ],
      'conseils': {
        'colonne_gauche': [{'titre': str, 'points': [str, ...]}, ...],
        'colonne_droite': [{'titre': str, 'points': [str, ...]}, ...],
      },
      'diet': {
        'prenom': str, 'nom': str, 'rpps': str,
        'tel': str, 'email': str, 'cabinet': str,
        'date': str,
      },
      'prescripteur': None | {     # None si pas de prescripteur
        'nom': str, 'profession': str, 'tel': str, 'email': str,
        'siret': str, 'structure': str,
        'notes_medicales': str,
      },
    }
    """
    pat    = config['patient']
    nutri  = config['nutrition']
    repas  = config['repas']
    cons   = config['conseils']
    diet   = config['diet']
    prescr = config.get('prescripteur')

    # Détecter objectif pour couleurs et libellés
    obj     = pat['objectif']
    is_pm   = obj == 'prise_masse'
    is_pp   = obj in ['perte_poids', 'seche']
    obj_labels = {
        'prise_masse':  ('PRISE DE MASSE MUSCULAIRE', GREEN_D),
        'perte_poids':  ('PERTE DE POIDS / RÉÉQUILIBRAGE', C('#185FA5')),
        'seche':        ('SÈCHE / PERTE DE GRAS', C('#185FA5')),
        'equilibre':    ('ÉQUILIBRE ALIMENTAIRE', GREEN_D),
        'performance':  ('PERFORMANCE SPORTIVE', GREEN_D),
    }
    obj_label, obj_color = obj_labels.get(obj, ('OBJECTIF NUTRITIONNEL', GREEN_D))

    niveau_labels = {
        'debutant':       'Débutant (< 2 ans)',
        'intermediaire':  'Intermédiaire (2–6 ans)',
        'confirme':       'Confirmé (> 7 ans)',
    }

    surplus_pct = nutri.get('surplus_pct', 5)
    surplus_kcal = round(nutri['kcal_jour'] * surplus_pct / 100)
    surplus_desc = (
        f"Excès autorisés : {surplus_pct}% ≈ {surplus_kcal} kcal/jour "
        f"(produit frit, sucré, ultra-transformé, alcool, soda…)"
    )

    JOURS = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.']

    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=0.8*cm, rightMargin=0.8*cm,
        topMargin=1.75*cm, bottomMargin=1.0*cm
    )
    on_page = make_hf(
        {'nom': f"{diet['prenom']} {diet['nom']}", 'rpps': diet['rpps'], 'email': diet['email']},
        {'nom': prescr['nom'], 'profession': prescr['profession']} if prescr else None
    )
    story = []

    # ══════════════ PAGE 1 ══════════════════════════════════════════════════════

    # Bandeau objectif
    niveau_str = f" · {niveau_labels.get(pat.get('niveau_pratique',''), '')}" if pat.get('niveau_pratique') else ''
    obj_row = Table([[
        Paragraph(f'🎯 <b>OBJECTIF : {obj_label}</b>{niveau_str}',
                  S('ot', fontName='Helvetica-Bold', fontSize=7.5, textColor=obj_color, leading=10)),
        Paragraph(f'<b>{nutri["kcal_jour"]} kcal / jour</b>  ·  '
                  f'Protéines {nutri["proteines_g"]}g  ·  '
                  f'Sources de glucides {nutri["glucides_sources_g"]}g  ·  '
                  f'Lipides {nutri["lipides_g"]}g',
                  S('ot2', fontName='Helvetica-Bold', fontSize=7.5, textColor=DARK, leading=10, alignment=TA_RIGHT)),
    ]], colWidths=[(W-1.6*cm)*0.55, (W-1.6*cm)*0.45])
    obj_row.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GREEN_L),
        ('BOX', (0,0), (-1,-1), 1.5, GREEN),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(obj_row)
    story.append(Spacer(1, 0.07*cm))

    # Fiche patient
    notes_str = f" · {pat['notes']}" if pat.get('notes') else ''
    niveau_fiche = f" · Pratique : {niveau_labels.get(pat.get('niveau_pratique',''), '')}" if pat.get('niveau_pratique') else ''
    fiche_cells = [
        Paragraph(
            f"<b>{pat['prenom']} {pat['nom']}</b> · {pat['age']} ans · {pat['ville']}<br/>"
            f"{pat['poids']} kg · {pat['taille']} cm · {pat['activite']}"
            f"{niveau_fiche}{notes_str}",
            S('f', fontSize=6.5, textColor=DARK, leading=9.5)
        ),
        Paragraph(
            f"Plan {nutri['duree_semaines']} semaines · "
            + (f"Surplus +300 kcal" if is_pm else f"Déficit ajusté") +
            f" · Budget : {pat['budget']}"
            + (f"<br/>Restrictions : {pat['restrictions']}" if pat.get('restrictions') and pat['restrictions'] != 'aucune' else ""),
            S('f2', fontSize=6.5, textColor=GRAY, alignment=TA_CENTER, leading=9.5)
        ),
        Paragraph(
            f"<b>{diet['prenom']} {diet['nom']}</b><br/>"
            f"RPPS {diet['rpps']}<br/>"
            + (f"<b>Prescrit par :</b> {prescr['nom']}" if prescr else ""),
            S('f3', fontName='Helvetica-Bold', fontSize=6.5, textColor=GREEN_D, alignment=TA_RIGHT, leading=9.5)
        ),
    ]
    fiche = Table([fiche_cells], colWidths=[(W-1.6*cm)*0.42, (W-1.6*cm)*0.35, (W-1.6*cm)*0.23])
    fiche.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CREAM),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(fiche)
    story.append(Spacer(1, 0.06*cm))

    # Légende
    story.append(Paragraph(
        '<font color="#0F6E56"><b>⊛</b></font>=variante végé  ·  '
        '<b>💡</b>=astuce budget  ·  '
        '<i>2e ligne italique</i>=exemple alternatif  ·  '
        'fb=fromage blanc  ·  '
        '<b>Tous les produits laitiers, yaourts et compotes : sans sucres ajoutés</b>',
        S('l', fontSize=5.8, textColor=GRAY, spaceAfter=4)
    ))

    # Tableau double entrée
    col0 = 2.2*cm
    col_j = (W - 1.6*cm - col0) / 7
    cw = [col0] + [col_j] * 7

    for r in repas:
        hcol = C(r['couleur'])
        tc = DARK if r.get('texte_sombre', False) else colors.white
        row_h = [Paragraph(f'<b>{r["nom"]}</b>',
                            S('rh', fontName='Helvetica-Bold', fontSize=5.8, textColor=tc, leading=8.5))]
        row_h += [Paragraph(f'<b>{j}</b>', S('jh', fontName='Helvetica-Bold', fontSize=6,
                             textColor=tc, alignment=TA_CENTER)) for j in JOURS]

        row_d = [Paragraph('', S('e'))]
        for j_data in r['jours']:
            row_d.append(cell(j_data['ex1'], j_data.get('ex2'), j_data.get('veg')))

        t = Table([row_h, row_d], colWidths=cw)
        bg = CREAM if r.get('texte_sombre', False) else colors.white
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), hcol),
            ('TOPPADDING', (0,0), (-1,0), 2), ('BOTTOMPADDING', (0,0), (-1,0), 2),
            ('LEFTPADDING', (0,0), (-1,0), 3),
            ('VALIGN', (0,1), (-1,1), 'TOP'),
            ('TOPPADDING', (0,1), (-1,1), 2), ('BOTTOMPADDING', (0,1), (-1,1), 2),
            ('LEFTPADDING', (0,1), (-1,1), 3), ('RIGHTPADDING', (0,1), (-1,1), 2),
            ('GRID', (0,0), (-1,-1), 0.25, BORDER),
            ('BACKGROUND', (0,1), (-1,1), bg),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.06*cm))

    # Ligne totaux
    tot = Table(
        [[Paragraph('', S('x'))] + [Paragraph(f'<b>{j}</b>',
          S('x', fontName='Helvetica-Bold', fontSize=6, textColor=colors.white, alignment=TA_CENTER))
          for j in JOURS],
         [Paragraph('<b>Total kcal</b>', S('x', fontName='Helvetica-Bold', fontSize=7, textColor=GREEN_D))] +
         [Paragraph(f'<b>{nutri["kcal_jour"]}</b>',
          S('x', fontSize=7, alignment=TA_CENTER, textColor=GREEN_D, fontName='Helvetica-Bold'))
          for _ in JOURS]],
        colWidths=cw
    )
    tot.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TOPPADDING', (0,0), (-1,-1), 2), ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('BACKGROUND', (0,1), (-1,1), GREEN_L),
    ]))
    story.append(tot)
    story.append(Spacer(1, 0.07*cm))

    # Encart excès
    exc_color = AMBER if is_pm else RED_L
    exc_text_color = AMBER_D if is_pm else RED_D
    exc = Table([[
        Paragraph(f'🎯 <b>Excès autorisés ({surplus_pct}%) ≈ {surplus_kcal} kcal/jour</b>',
                  S('et', fontName='Helvetica-Bold', fontSize=7, textColor=exc_text_color)),
        Paragraph('Un excès = aliment à faible valeur nutritive : produit frit, sucré, ultra-transformé, '
                  'verre d\'alcool, soda, gâteau industriel. <b>Ponctuel, hors repas structurés.</b>',
                  S('ed', fontSize=6.5, textColor=exc_text_color, leading=9)),
    ]], colWidths=[(W-1.6*cm)*0.38, (W-1.6*cm)*0.62])
    exc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), exc_color),
        ('BOX', (0,0), (-1,-1), 0.8, exc_text_color),
        ('LEFTPADDING', (0,0), (-1,-1), 6), ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(exc)
    story.append(Spacer(1, 0.04*cm))

    # Disclaimer
    dis = Table([[Paragraph(
        'Recommandation nutritionnelle validée par un diét. RPPS. Résultats variables selon métabolisme et régularité. '
        'En cas de grossesse, pathologie ou traitement médical en cours, consultez votre médecin traitant.',
        S('d', fontSize=5.8, textColor=AMBER_D, leading=8))]], colWidths=[W-1.6*cm])
    dis.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), AMBER),
        ('BOX', (0,0), (-1,-1), 0.5, C('#E5A640')),
        ('LEFTPADDING', (0,0), (-1,-1), 6), ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 3), ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(dis)

    # ══════════════ PAGE 2 ══════════════════════════════════════════════════════
    story.append(PageBreak())

    story.append(Paragraph(
        f'Analyse nutritionnelle & conseils — {obj_label.title()}',
        S('h2', fontName='Helvetica-Bold', fontSize=10, textColor=DARK, spaceAfter=2)
    ))
    story.append(Paragraph(
        f'{diet["prenom"]} {diet["nom"]} · Diét.-Nutritionniste · RPPS {diet["rpps"]} · {diet["email"]}',
        S('s2', fontSize=7, textColor=GRAY, spaceAfter=3)
    ))
    story.append(HRFlowable(width='100%', thickness=1, color=GREEN, spaceAfter=5))

    # Rappel objectif + prescripteur si présent
    recap_cells = [
        Paragraph(f'🎯 <b>{pat["prenom"]} {pat["nom"]}</b> · {obj_label}',
                  S('ro', fontName='Helvetica-Bold', fontSize=7, textColor=obj_color)),
        Paragraph(f'<b>{nutri["kcal_jour"]} kcal/jour</b> · {nutri["duree_semaines"]} semaines',
                  S('ro2', fontSize=7, textColor=DARK, alignment=TA_CENTER)),
        Paragraph(f'Excès : {surplus_kcal} kcal/j max ({surplus_pct}%)',
                  S('ro3', fontSize=7, textColor=AMBER_D, alignment=TA_RIGHT)),
    ]
    recap = Table([recap_cells], colWidths=[(W-1.6*cm)*0.42, (W-1.6*cm)*0.35, (W-1.6*cm)*0.23])
    recap.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GREEN_L), ('BOX', (0,0), (-1,-1), 1, GREEN),
        ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(recap)

    # Bloc prescripteur si présent
    if prescr:
        story.append(Spacer(1, 0.08*cm))
        presc_info = (
            f'<b>Prescrit par :</b> {prescr["nom"]} · {prescr["profession"]} · '
            f'SIRET {prescr["siret"]} · {prescr["structure"]}'
        )
        if prescr.get('notes_medicales'):
            presc_info += f'<br/><b>Notes médicales :</b> {prescr["notes_medicales"]}'
        pr = Table([[Paragraph(presc_info, S('pr', fontSize=6.8, textColor=C('#185FA5'), leading=9.5))]],
                   colWidths=[W-1.6*cm])
        pr.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), C('#E6F1FB')),
            ('BOX', (0,0), (-1,-1), 0.8, C('#185FA5')),
            ('LEFTPADDING', (0,0), (-1,-1), 7), ('RIGHTPADDING', (0,0), (-1,-1), 7),
            ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(pr)

    story.append(Spacer(1, 0.15*cm))

    # Graphiques
    kcal_par_repas = [r['kcal'] for r in repas]
    cols_repas = [C(r['couleur']) for r in repas]
    p_pct = round(nutri['proteines_g'] * 4 * 100 / nutri['kcal_jour'])
    g_pct = round(nutri['glucides_sources_g'] * 4 * 100 / nutri['kcal_jour'])
    l_pct = 100 - p_pct - g_pct

    pie1 = make_pie([p_pct, g_pct, l_pct], [GREEN, BLUE, AMBER_D], 'Macros (% énergie)')
    pie2 = make_pie(kcal_par_repas, cols_repas, 'Énergie par repas')
    pie3 = make_pie([40, 25, 25, 10], [GREEN_D, TEAL, GREEN_L, AMBER], 'Sources de protéines')

    l1 = make_legend([
        f'Protéines : {p_pct}% · {nutri["proteines_g"]}g/j',
        f'Sources de glucides : {g_pct}% · {nutri["glucides_sources_g"]}g/j',
        f'Lipides : {l_pct}% · {nutri["lipides_g"]}g/j',
    ])
    l2 = make_legend([f'{r["nom"]} : {r["kcal"]} kcal' for r in repas])
    l3 = make_legend(['Viande & poisson : 40%', 'Légumineuses : 25%',
                       'Produits laitiers 0% : 25%', 'Œufs : 10%'])

    graphs = Table([[pie1, pie2, pie3], [l1, l2, l3]],
                   colWidths=[(W-1.6*cm)/3]*3)
    graphs.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 1), ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    story.append(graphs)
    story.append(Spacer(1, 0.12*cm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=6))

    story.append(Paragraph('Conseils diététiques personnalisés',
                            S('hc', fontName='Helvetica-Bold', fontSize=9, textColor=GREEN_D, spaceAfter=4)))

    def build_col(sections):
        r = []
        for sec in sections:
            r.append(Paragraph(sec['titre'],
                                S('ct', fontName='Helvetica-Bold', fontSize=7.8, textColor=DARK,
                                  spaceAfter=2, spaceBefore=5)))
            for pt in sec['points']:
                r.append(Paragraph(f'• {pt}',
                                    S('cp', fontSize=6.5, textColor=GRAY, leading=9.5, spaceAfter=0.5)))
        return r

    cg = build_col(cons['colonne_gauche'])
    cd = build_col(cons['colonne_droite'])
    ml = max(len(cg), len(cd))
    while len(cg) < ml: cg.append(Paragraph('', S('x')))
    while len(cd) < ml: cd.append(Paragraph('', S('x')))

    cols_tbl = Table([[cg, cd]], colWidths=[(W-1.6*cm)/2]*2)
    cols_tbl.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 5), ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('LINEAFTER', (0,0), (0,-1), 0.5, BORDER),
    ]))
    story.append(cols_tbl)
    story.append(Spacer(1, 0.12*cm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=4))

    # Signature
    sig_col2 = f'[signature électronique certifiée]'
    sig_data = [
        [Paragraph('<b>Validé et signé par :</b>',
                   S('sx', fontName='Helvetica-Bold', textColor=DARK, fontSize=7.5)),
         Paragraph(f'{diet["cabinet"]} · {diet["date"]}',
                   S('sx', alignment=TA_RIGHT, fontSize=7.5))],
        [Paragraph(f'{diet["prenom"]} {diet["nom"]} — Diét.-Nutritionniste',
                   S('sx', fontName='Helvetica-Bold', textColor=GREEN_D, fontSize=8)),
         Paragraph(sig_col2, S('sx', alignment=TA_RIGHT, textColor=GRAY, fontSize=7.5))],
        [Paragraph(f'RPPS : {diet["rpps"]} · {diet["tel"]} · {diet["email"]}',
                   S('sx', textColor=GRAY, fontSize=7)),
         Paragraph('CaliDoc Santé · 4 rue Saint-André · 16000 Angoulême',
                   S('sx', textColor=GRAY, fontSize=6.5, alignment=TA_RIGHT))],
    ]
    sig = Table(sig_data, colWidths=[10*cm, 8*cm])
    sig.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1.5, GREEN), ('LINEAFTER', (0,0), (0,-1), 0.5, BORDER),
        ('BACKGROUND', (0,0), (-1,0), GREEN_L),
        ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(sig)

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"✓ PDF généré : {output_path} ({doc.page} pages)")
    return output_path


# ══════════════════════════════════════════════════════════════════════════════
# EXEMPLE — Plan Mehdi (prise de masse, intermédiaire)
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    TEAL_C = '#5DCAA5'; TEAL_L_C = '#9FE1CB'

    config_mehdi = {
        'patient': {
            'prenom': 'Mehdi', 'nom': 'K.', 'age': 33, 'ville': 'Toulouse',
            'poids': 74, 'taille': 178,
            'objectif': 'prise_masse',
            'activite': 'Musculation 4×/semaine',
            'niveau_pratique': 'intermediaire',
            'budget': 'serré (<40€/sem.)',
            'restrictions': 'aucune',
            'notes': '',
        },
        'nutrition': {
            'kcal_jour': 3000, 'proteines_g': 160,
            'glucides_sources_g': 310, 'lipides_g': 90,
            'surplus_pct': 6, 'duree_semaines': 4,
        },
        'repas': [
            {
                'nom': 'Petit-déj.\n≈ 550 kcal', 'kcal': 550,
                'couleur': '#1D9E75', 'texte_sombre': False,
                'jours': [
                    {'ex1': 'Avoine 100g + lait ½ écrémé 250ml + 2 œufs brouillés',
                     'ex2': 'ou pain complet 3 tr. + beurre 10g + fb 0% 150g'},
                    {'ex1': 'Avoine 100g + yaourt nature 0% 150g + banane + amandes 15g',
                     'ex2': 'ou muesli nature 80g + lait 250ml + noix 15g + miel 10g'},
                    {'ex1': 'Pain complet 3 tr. + beurre 10g + 3 œufs scrambled',
                     'ex2': 'ou avoine 100g + lait 250ml + chia 15g + miel 10g'},
                    {'ex1': 'Avoine 100g + lait 250ml + banane + yaourt 0% 125g',
                     'ex2': 'ou muesli 80g + lait 250ml + myrtilles 80g + miel 10g'},
                    {'ex1': 'Avoine 100g + lait 250ml + 2 petits-suisses 0% MG + chia 15g',
                     'ex2': 'ou pain complet 3 tr. + beurre 10g + fb 0% 200g + fruit\n💡 2 petits-suisses 0% MG = 12g prot., 3× moins cher que le skyr'},
                    {'ex1': 'Yaourt nature 0% 200g + granola nature 70g + myrtilles 80g + miel 10g',
                     'ex2': 'ou fb 0% 200g + flocons avoine 60g + fruit + noix 15g'},
                    {'ex1': '3 œufs scrambled + pain complet 2 tr. + fb 0% 200g + fruit',
                     'ex2': 'ou avoine 100g + lait 250ml + yaourt 0% 125g + miel'},
                ]
            },
            {
                'nom': 'Coll. mat.\n≈ 220 kcal', 'kcal': 220,
                'couleur': TEAL_C, 'texte_sombre': False,
                'jours': [
                    {'ex1': 'Banane + amandes 25g', 'ex2': 'ou fb 0% 150g + noix 20g'},
                    {'ex1': '2 petits-suisses 0% MG (120g) + noix 30g 💡', 'ex2': 'ou pomme + noix de cajou 30g'},
                    {'ex1': 'Pomme + noix de cajou 30g', 'ex2': 'ou fb 0% 150g + raisins secs 20g + amandes 15g'},
                    {'ex1': 'Poire 170g + noix mélangées 30g', 'ex2': 'ou fb 0% 150g + noix 25g + miel 5g'},
                    {'ex1': 'Banane + yaourt 0% 125g + pistaches 15g', 'ex2': 'ou pomme + amandes 30g'},
                    {'ex1': 'Fb 0% 150g + noix 25g + miel 5g', 'ex2': 'ou banane + noix de cajou 25g'},
                    {'ex1': '2 petits-suisses 0% MG + fruit + amandes 15g 💡', 'ex2': 'ou fb 0% 150g + raisins 20g'},
                ]
            },
            {
                'nom': 'Déjeuner\n≈ 920 kcal', 'kcal': 920,
                'couleur': '#0d2018', 'texte_sombre': False,
                'jours': [
                    {'ex1': 'Blanc poulet rôti 220g + riz basmati 200g + brocolis 200g + olive 15ml',
                     'ex2': 'ou escalope dinde 200g + mêmes accompagnements',
                     'veg': 'Tofu ferme 220g · mêmes accompagnements'},
                    {'ex1': 'Saumon vapeur 200g + quinoa 200g + épinards 150g + olive 12ml',
                     'ex2': 'ou dorade four 200g + pdt 200g + h. verts 150g',
                     'veg': 'Œufs durs 3 + cottage 100g · mêmes féculents'},
                    {'ex1': 'Steak haché 5% MG 200g + lentilles 200g + carottes 150g + colza 12ml',
                     'ex2': 'ou bœuf mijoté 200g + même base',
                     'veg': 'Seitan grillé 180g · mêmes légumineuses et légumes'},
                    {'ex1': 'Cabillaud vapeur 220g + patate douce 250g + courgettes 150g + olive 12ml',
                     'ex2': 'ou lieu noir 220g + riz complet 180g + poireaux 150g',
                     'veg': 'Cottage cheese 200g + légumes identiques'},
                    {'ex1': 'Escalope dinde 200g + pâtes complètes 200g + h. verts 150g + olive 12ml',
                     'ex2': 'ou blanc poulet 200g + riz 180g + brocolis 200g',
                     'veg': 'Tempeh grillé 180g · mêmes accompagnements'},
                    {'ex1': 'Crevettes 220g + riz basmati 200g + poivrons + oignons 150g + colza 12ml',
                     'ex2': 'ou thon grillé 200g + mêmes accompagnements',
                     'veg': 'Pois chiches rôtis 220g · mêmes accompagnements'},
                    {'ex1': 'Poulet mijoté 230g + haricots blancs 180g + carottes 150g + colza 10ml',
                     'ex2': 'ou bœuf bourguignon allégé 200g + pdt 200g',
                     'veg': 'Lentilles corail 200g + légumes du jour + olive'},
                ]
            },
            {
                'nom': 'Goûter\n≈ 250 kcal', 'kcal': 250,
                'couleur': TEAL_C, 'texte_sombre': False,
                'jours': [
                    {'ex1': 'Fb 0% 250g + noix 20g + miel 10g', 'ex2': 'ou yaourt 0% 200g + granola nature 40g + miel 10g'},
                    {'ex1': 'Pomme + amandes 35g', 'ex2': 'ou fb 0% 200g + miel 10g + flocons 20g'},
                    {'ex1': '2 petits-suisses 0% MG + miel 15g + flocons avoine 30g 💡', 'ex2': 'ou fb 0% 200g + raisins 20g + noix 15g'},
                    {'ex1': 'Banane + fb 0% 200g + miel 5g', 'ex2': 'ou poire + yaourt 0% 150g + amandes 20g'},
                    {'ex1': 'Noix mélangées 30g + fruit + yaourt 0% 125g', 'ex2': 'ou fb 0% 200g + granola nature 35g'},
                    {'ex1': 'Yaourt 0% 200g + granola nature 40g + miel 10g', 'ex2': 'ou fb 0% 200g + noix 20g + banane'},
                    {'ex1': 'Poire + banane 80g + amandes 20g', 'ex2': 'ou fb 0% 200g + miel 10g + flocons 25g'},
                ]
            },
            {
                'nom': 'Dîner\n≈ 830 kcal', 'kcal': 830,
                'couleur': '#0d2018', 'texte_sombre': False,
                'jours': [
                    {'ex1': 'Saumon papillote 200g + quinoa 150g + ratatouille 250g + olive 12ml',
                     'ex2': 'ou daurade four 200g + riz complet 130g + légumes rôtis 250g',
                     'veg': 'Tofu soyeux 200g · mêmes légumes et féculents'},
                    {'ex1': 'Filet poulet grillé 200g + pdt vapeur 270g + salade + vinaigrette 12ml',
                     'ex2': 'ou blanc dinde 190g + patate douce 230g + h. verts 150g',
                     'veg': 'Œufs cocotte 3 + gruyère 20g · mêmes accompagnements'},
                    {'ex1': 'Dorade ou bar four 210g + légumes rôtis 280g + pain complet 1 tr.',
                     'ex2': 'ou cabillaud 200g + même base + riz 100g',
                     'veg': 'Feta grillée 130g + légumes identiques'},
                    {'ex1': 'Escalope dinde 190g + riz thaï 140g + brocolis 250g + olive 12ml',
                     'ex2': 'ou blanc poulet 180g + pâtes complètes 140g + épinards 200g',
                     'veg': 'Edamame 200g · même riz et légumes'},
                    {'ex1': 'Maquereau four 190g + lentilles 170g + épinards 180g + colza 12ml\n💡 Maquereau boîte = oméga-3, 5× moins cher que le saumon',
                     'ex2': 'ou sardines four 190g + pdt 200g + h. verts 150g',
                     'veg': 'Œufs durs 3 · même base lentilles'},
                    {'ex1': 'Blanc poulet 190g + quinoa 150g + concombre + tomate + roquette + olive 15ml',
                     'ex2': 'ou crevettes 180g + riz basmati 140g + poivrons 150g',
                     'veg': 'Pois chiches 220g · même salade'},
                    {'ex1': 'Velouté butternut 300ml + poulet effiloché 150g + pain 2 tr. + fb 0% 100g',
                     'ex2': 'ou soupe légumes 300ml + blanc dinde 140g + riz 100g + noix 15g',
                     'veg': '2 œufs pochés + même soupe + pain'},
                ]
            },
            {
                'nom': 'Coll. soir\n≈ 230 kcal', 'kcal': 230,
                'couleur': TEAL_L_C, 'texte_sombre': True,
                'jours': [
                    {'ex1': 'Fb 0% 200g + noix 20g + miel 5g', 'ex2': 'ou yaourt 0% 200g + amandes 25g + miel 8g'},
                    {'ex1': '2 petits-suisses 0% MG + flocons avoine 35g + lait 50ml + miel 5g 💡', 'ex2': 'ou fb 0% 200g + petite banane 80g + miel 5g'},
                    {'ex1': 'Fb 0% 200g + petite banane 80g + miel 5g', 'ex2': 'ou 2 petits-suisses 0% MG + miel 10g + granola nature 30g'},
                    {'ex1': 'Yaourt 0% 200g + amandes 25g + miel 8g', 'ex2': 'ou fb 0% 250g + noix 15g + miel 8g'},
                    {'ex1': 'Fb 0% 250g + noix 15g + miel 8g', 'ex2': 'ou 2 petits-suisses 0% MG + flocons 35g + lait + miel'},
                    {'ex1': '2 petits-suisses 0% MG + miel 10g + granola nature 30g 💡', 'ex2': 'ou fb 0% 200g + raisins secs 20g + amandes 15g'},
                    {'ex1': 'Fb 0% 200g + raisins secs 20g + amandes 15g', 'ex2': 'ou yaourt 0% 200g + noix 20g + miel 8g'},
                ]
            },
        ],
        'conseils': {
            'colonne_gauche': [
                {'titre': '🥩 Protéines — sources et qualité', 'points': [
                    'Viser 30–40g de protéines par repas principal.',
                    '<b>Produits laitiers 0% sans sucres ajoutés</b> = fromage blanc, petits-suisses 0% MG, yaourt nature 0%.',
                    '💡 2 petits-suisses 0% MG (120g) = 12g de protéines à ~0,20€ contre 0,80€ pour un skyr.',
                    '<b>Sources animales :</b> poulet, saumon, maquereau, œufs.',
                    '<b>Sources végétales :</b> lentilles, pois chiches, tofu — toujours combiner avec une source de glucides (riz, pain) pour les acides aminés essentiels.',
                ]},
                {'titre': '🌾 Sources de glucides — carburant essentiel', 'points': [
                    'Riz, pâtes complètes, avoine, patate douce, pain complet = ne jamais réduire en prise de masse.',
                    'Déficit en sources de glucides = moins d\'énergie à l\'entraînement = progression ralentie.',
                    '💡 Riz et flocons d\'avoine en vrac = −40%. Compotes uniquement <b>sans sucres ajoutés</b>.',
                ]},
                {'titre': '💰 Budget malin', 'points': [
                    '💡 Cuisses de poulet = 3× moins chères que les blancs, autant de protéines.',
                    '💡 Maquereau/sardines en boîte = oméga-3, 5× moins chers que le saumon frais.',
                    '💡 Légumes surgelés (brocolis, épinards) = aussi nutritifs que frais, moitié prix.',
                    '💡 Lentilles sèches = 4× moins chères qu\'en conserve (cuisson 20 min).',
                    'Batch cooking le dimanche : 2h pour 4–5 jours.',
                ]},
            ],
            'colonne_droite': [
                {'titre': '📊 Suivi selon le niveau de pratique', 'points': [
                    '<b>Débutant (&lt;2 ans) :</b> +0,8–1 kg/mois possible, surplus de 150–200 kcal suffit.',
                    '<b>Intermédiaire (2–6 ans) — votre profil :</b> +0,3–0,5 kg/mois, surplus de 300 kcal.',
                    '<b>Confirmé (&gt;7 ans) :</b> progression très lente, surplus de 400–500 kcal souvent nécessaire.',
                    'Pesée 1×/semaine à jeun. Prise &lt;0,3 kg/mois → +1 banane +30g avoine/jour.',
                    'Prise &gt;0,6 kg/mois → réduire sources de glucides du dîner de 20%.',
                    'Point diététique à J+28 pour ajuster les quantités.',
                ]},
                {'titre': '⚠️ Signaux & ajustements', 'points': [
                    '<b>Fatigue :</b> ne jamais réduire les sources de glucides en prise de masse.',
                    '<b>Ballonnements :</b> introduire les légumineuses progressivement sur 2–3 semaines.',
                    '<b>Somnolence après déjeuner :</b> réduire légèrement, augmenter le goûter.',
                    '<b>Excès autorisés (6%) :</b> produits frits, sucrés, sodas, alcool — ponctuel uniquement, max 180 kcal/jour.',
                    '💧 Minimum 2,5L d\'eau/jour. Tisanes non sucrées comptent.',
                ]},
            ],
        },
        'diet': {
            'prenom': 'Grégoire', 'nom': 'Martin',
            'rpps': '10 008 019 381', 'tel': '06 45 77 38 15',
            'email': 'gmartin.diet@gmail.com',
            'cabinet': 'Cabinet libéral · CHU Angoulême',
            'date': '28 mars 2026',
        },
        'prescripteur': None,
    }

    generate_plan(config_mehdi, '/home/claude/nutridoc-plan-mehdi-demo.pdf')
