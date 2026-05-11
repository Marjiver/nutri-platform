// ============================================================
//  Supabase Edge Function : generate-pdf
//  Chemin : supabase/functions/generate-pdf/index.ts
//
//  Génère le PDF signé d'un plan alimentaire validé.
//  Flux :
//    1. Auth JWT diét. → vérifier que le plan lui appartient
//    2. Charger plan + bilan + profil diét. depuis Supabase
//    3. Générer le PDF (pdf-lib) :
//         Page 1 — en-tête + patient + cadre nutritionnel + conseils
//         Page 2 — tableau 7 jours × repas
//         Page 3 — attestation RPPS + clause + signature
//         Filigrane NutriDoc sur chaque page
//    4. Upload dans Storage bucket "plans-pdf"
//    5. URL signée (7 jours)
//    6. Email Resend au patient avec le lien
//    7. Mise à jour plans.pdf_url
//
//  Secrets requis :
//    SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · RESEND_API_KEY
// ============================================================

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from "https://esm.sh/pdf-lib@1.17.1";

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ok  = (d: unknown)          => new Response(JSON.stringify(d),        { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s,   headers: { ...cors, "Content-Type": "application/json" } });

// ── Couleurs ──────────────────────────────────────────────────────────────────
const GREEN  = rgb(0.114, 0.620, 0.459);   // #1D9E75
const GDARK  = rgb(0.059, 0.431, 0.337);   // #0f6e56
const DARK   = rgb(0.051, 0.125, 0.094);   // #0d2018
const GRAY   = rgb(0.294, 0.333, 0.388);   // #4b5563
const LGRAY  = rgb(0.631, 0.671, 0.722);   // #9ca3af
const CREAM  = rgb(0.969, 0.980, 0.969);   // #f7f9f7
const LGREEN = rgb(0.941, 0.980, 0.965);   // #f0faf6
const WARN   = rgb(0.996, 0.976, 0.769);   // #fef9c3
const WHITE  = rgb(1, 1, 1);

// ── Dimensions A4 ─────────────────────────────────────────────────────────────
const W = 595.28, H = 841.89;
const ML = 45, MR = 45, MT = 40, MB = 40;
const CW = W - ML - MR;                    // largeur contenu = 505pt

// ── Normalisation des caractères accentués pour Helvetica Standard ─────────────
// Helvetica (StandardFonts) supporte Latin-1 via WinAnsi
function n(s: string | undefined | null): string {
  if (!s) return "";
  // Remplacer les caractères hors Latin-1 courants
  return String(s)
    .replace(/[àâä]/g, "a").replace(/[éèêë]/g, "e")
    .replace(/[îï]/g, "i").replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u").replace(/ç/g, "c").replace(/ñ/g, "n")
    .replace(/[ÀÂÄÁÃ]/g, "A").replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÎÏ]/g, "I").replace(/[ÔÖ]/g, "O")
    .replace(/[ÙÛÜÚ]/g, "U").replace(/Ç/g, "C")
    .replace(/[œŒ]/g, "oe").replace(/[æÆ]/g, "ae")
    .replace(/[€]/g, "EUR").replace(/[•·]/g, "-")
    .replace(/[""«»]/g, '"').replace(/['']/g, "'")
    .replace(/[–—]/g, "-").replace(/…/g, "...");
}

// ── Découper un texte long en lignes ──────────────────────────────────────────
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = n(text).split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    try {
      if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    } catch {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Classe PDFBuilder — gère le curseur et les sauts de page ──────────────────
class PDFBuilder {
  doc: PDFDocument;
  pages: any[] = [];
  currentPage: any;
  y: number;         // curseur vertical (descend)
  fonts: Record<string, any> = {};

  constructor(doc: PDFDocument, fonts: Record<string, any>) {
    this.doc = doc;
    this.fonts = fonts;
    this.currentPage = null!;
    this.y = 0;
  }

  addPage() {
    const page = this.doc.addPage([W, H]);
    this.pages.push(page);
    this.currentPage = page;
    this.y = H - MT;
    return page;
  }

  // Vérifier s'il reste assez de place, sinon nouvelle page
  ensureSpace(needed: number) {
    if (this.y - needed < MB + 20) {
      this.addPage();
      this.drawMiniHeader(); // répéter l'en-tête sur chaque page
    }
  }

  // Texte simple
  text(txt: string, x: number, y: number, opts: {
    font?: any; size?: number; color?: any; maxWidth?: number;
  } = {}) {
    const font  = opts.font  ?? this.fonts.regular;
    const size  = opts.size  ?? 8;
    const color = opts.color ?? DARK;
    try {
      this.currentPage.drawText(n(txt), { x, y, size, font, color, maxWidth: opts.maxWidth });
    } catch { /* ignorer les erreurs d'encodage */ }
  }

  // Texte multiligne avec retour à la ligne automatique
  textWrapped(txt: string, x: number, startY: number, opts: {
    font?: any; size?: number; color?: any; maxWidth?: number; lineHeight?: number;
  } = {}): number {
    const font       = opts.font       ?? this.fonts.regular;
    const size       = opts.size       ?? 8;
    const color      = opts.color      ?? DARK;
    const maxWidth   = opts.maxWidth   ?? CW;
    const lineHeight = opts.lineHeight ?? (size * 1.45);
    const lines      = wrapText(txt, maxWidth, font, size);
    let y = startY;
    for (const line of lines) {
      this.text(line, x, y, { font, size, color });
      y -= lineHeight;
    }
    return startY - y; // hauteur consommée
  }

  // Rectangle plein
  rect(x: number, y: number, w: number, h: number, color: any) {
    this.currentPage.drawRectangle({ x, y, width: w, height: h, color });
  }

  // Rectangle avec bordure
  rectBorder(x: number, y: number, w: number, h: number, color: any, border: any, bw = 0.8) {
    this.currentPage.drawRectangle({ x, y, width: w, height: h, color, borderColor: border, borderWidth: bw });
  }

  // Ligne horizontale
  line(x1: number, y: number, x2: number, color = LGRAY, width = 0.5) {
    this.currentPage.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: width, color });
  }

  // Filigrane diagonal sur la page courante
  drawWatermark() {
    const wm = "NUTRIDOC";
    const step = 90;
    for (let xi = -50; xi < W + 50; xi += 180) {
      for (let yi = -50; yi < H + 50; yi += step) {
        try {
          this.currentPage.drawText(wm, {
            x: xi, y: yi,
            size: 18, font: this.fonts.bold,
            color: rgb(0.114, 0.620, 0.459),
            opacity: 0.07,
            rotate: degrees(38),
          });
        } catch { /* ignorer */ }
      }
    }
  }

  // En-tête de page (mini — pages 2+)
  drawMiniHeader() {
    this.rect(ML, H - MT - 18, CW, 18, LGREEN);
    this.text("NutriDoc — Plan alimentaire personnalise", ML + 6, H - MT - 13, {
      font: this.fonts.bold, size: 8, color: GDARK,
    });
    this.y = H - MT - 18 - 10;
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  HANDLER
// ════════════════════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey   = Deno.env.get("RESEND_API_KEY") ?? "";

  if (!supabaseUrl || !supabaseKey) return err("Configuration manquante", 500);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (!token) return err("Token manquant", 401);

  const sb = createClient(supabaseUrl, supabaseKey);
  const anonSb = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY") ?? supabaseKey,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user } } = await anonSb.auth.getUser(token);
  if (!user) return err("Non authentifie", 401);

  const { data: dietProfile } = await sb.from("profiles")
    .select("role, prenom, nom, rpps, email, cabinet, ville, tel")
    .eq("id", user.id).single();

  if (!dietProfile || dietProfile.role !== "dietitian")
    return err("Acces reserve aux dieteticiens", 403);

  // ── Paramètres ──────────────────────────────────────────────────────────────
  const { plan_id } = await req.json();
  if (!plan_id) return err("plan_id requis", 400);

  // ── Charger le plan ─────────────────────────────────────────────────────────
  const { data: plan } = await sb.from("plans")
    .select("*, bilans(*)")
    .eq("id", plan_id).single();

  if (!plan) return err("Plan introuvable", 404);
  if (plan.dietitian_id && plan.dietitian_id !== user.id)
    return err("Plan appartient a un autre dieteticien", 403);

  const bilan   = plan.bilans  as any;
  const contenu = plan.contenu as any;
  const ac      = contenu.apports_cibles ?? {};
  const menus   = contenu.menus_7_jours  ?? [];
  const conseils = contenu.conseils ?? [];
  const repasJT  = contenu.journee_type?.repas ?? {};

  // Infos praticien depuis le plan (si renseigné) ou le profil
  const dv         = contenu.valide_par ?? {};
  const pratNom    = dv.nom_complet ?? `${dietProfile.prenom ?? ""} ${dietProfile.nom ?? ""}`.trim();
  const pratRpps   = dv.rpps  ?? dietProfile.rpps  ?? "—";
  const pratCab    = dv.cabinet ?? dietProfile.cabinet ?? "NutriDoc · CaliDoc Sante";
  const pratVille  = dv.ville  ?? dietProfile.ville  ?? "";
  const pratTel    = dv.tel    ?? dietProfile.tel    ?? "";

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // Repas couverture
  const ORDRE_REPAS = ["petit_dejeuner","collation_matin","dejeuner","gouter","diner"];
  const LABELS_REPAS: Record<string, string> = {
    petit_dejeuner:"Petit-dejeuner", collation_matin:"Collation",
    dejeuner:"Dejeuner", gouter:"Gouter", diner:"Diner",
  };
  const GPNNS_ICONS: Record<string, string> = {
    "Laitage":"[Laitage]", "Fruits frais":"[Fruits]",
    "Legumes cuits":"[Leg.cuits]", "Legumes crus":"[Leg.crus]",
    "Cereales completes":"[Cer.comp]", "Feculent":"[Fec.]",
    "Pain complet":"[Pain]", "Proteines animales":"[Prot.anim]",
    "Proteines vegetales":"[Prot.veg]", "Matieres grasses":"[Mat.gr]",
    "Oleagineux":"[Oleag.]",
  };
  const repasKeys: string[] = [];
  ORDRE_REPAS.forEach(k => { if (menus[0]?.repas?.[k]) repasKeys.push(k); });

  // Conseils obligatoires ANSES
  const conseilsSys = [
    "Attention aux calories cachees : moutarde, vinaigrette, sucre dans le cafe, huile de cuisson, creme fraiche. Ces petites quantites peuvent representer 200-400 kcal/j supplementaires.",
    "Sommeil : minimum 7h par nuit. Un manque chronique de sommeil favorise la prise de poids via la deregulation de la leptine et de la ghrehline.",
    "Activite physique : en complement du sport, visez au moins 10 000 pas par jour. Privilegiez les escaliers et la marche lors de vos deplacements.",
  ];
  const tousConseils = [...conseils, ...conseilsSys];

  // ════════════════════════════════════════════════════════════════════════════
  //  CRÉATION DU PDF
  // ════════════════════════════════════════════════════════════════════════════
  const doc = await PDFDocument.create();
  doc.setTitle(`Plan alimentaire - ${n(bilan?.prenom)} ${n(bilan?.nom)}`);
  doc.setAuthor(pratNom);
  doc.setCreator("NutriDoc by CaliDoc Sante");
  doc.setProducer("NutriDoc pdf-lib");
  doc.setCreationDate(new Date());

  const [fontReg, fontBold, fontIta] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.HelveticaOblique),
  ]);
  const fonts = { regular: fontReg, bold: fontBold, italic: fontIta };

  const b = new PDFBuilder(doc, fonts);

  // ════════════════════════════════════════════════════════════════════════════
  //  PAGE 1 — En-tête + Patient + Cadre nutritionnel + Conseils
  // ════════════════════════════════════════════════════════════════════════════
  b.addPage();
  b.drawWatermark();

  // ── BANDE VERTE EN-TÊTE ──
  b.rect(0, H - MT - 52, W, 52 + MT, GREEN);

  // Logo NutriDoc (grand, blanc)
  b.text("NutriDoc", ML, H - MT - 32, { font: fontBold, size: 26, color: WHITE });
  b.text("Plan alimentaire personnalise", ML, H - MT - 46, { font: fontReg, size: 8, color: rgb(0.8, 1, 0.9) });

  // Encart diét. (droite)
  const dietX = W - MR - 170;
  b.rect(dietX, H - MT - 50, 170, 50, rgb(0.059, 0.431, 0.337));
  b.text(pratNom, dietX + 8, H - MT - 16, { font: fontBold, size: 8.5, color: WHITE, maxWidth: 155 });
  b.text("Dieteticien · RPPS " + pratRpps, dietX + 8, H - MT - 27, { font: fontReg, size: 7, color: rgb(0.7, 0.95, 0.85) });
  b.text(pratCab, dietX + 8, H - MT - 37, { font: fontReg, size: 6.5, color: rgb(0.7, 0.9, 0.8) });
  b.text((pratVille ? pratVille + " · " : "") + dateStr, dietX + 8, H - MT - 47, { font: fontReg, size: 6, color: rgb(0.6, 0.85, 0.75) });

  b.y = H - MT - 52 - 12;

  // ── BLOC PATIENT ──
  const patH = 50;
  b.rect(ML, b.y - patH, CW, patH, LGREEN);
  b.line(ML, b.y - patH, ML + CW, b.y - patH, GREEN, 1.2);
  b.line(ML, b.y, ML + CW, b.y, GREEN, 0.5);

  b.text("PATIENT", ML + 8, b.y - 12, { font: fontBold, size: 6.5, color: GDARK });
  b.text(n(bilan?.prenom) + " " + n(bilan?.nom), ML + 8, b.y - 23, { font: fontBold, size: 11, color: DARK });
  b.text(
    `${bilan?.age ?? "—"} ans · ${n(bilan?.sexe) ?? "—"} · ${bilan?.poids ?? "—"} kg · ${bilan?.taille ?? "—"} cm`,
    ML + 8, b.y - 34, { font: fontReg, size: 7.5, color: GRAY }
  );
  const OBJL: Record<string,string> = {
    perte_poids:"Perte de poids", prise_masse:"Prise de masse",
    equilibre:"Equilibre", energie:"Energie", sante:"Sante", sport_perf:"Performance",
  };
  const ACTL: Record<string,string> = {
    sedentaire:"Sedentaire", leger:"Legere", modere:"Moderee", actif:"Active", tres_actif:"Tres active",
  };
  b.text(
    `Objectif : ${OBJL[bilan?.objectif] ?? "—"}  ·  Activite : ${ACTL[bilan?.activite] ?? "—"}`,
    ML + 8, b.y - 44, { font: fontReg, size: 7, color: GRAY }
  );

  // Cibles (droite du bloc patient)
  const cx = ML + CW - 140;
  b.text("CIBLES JOURNALIERES", cx, b.y - 12, { font: fontBold, size: 6.5, color: GDARK });
  b.text(`${ac.calories ?? "—"} kcal`, cx, b.y - 24, { font: fontBold, size: 13, color: GREEN });
  b.text(
    `P ${ac.proteines_g ?? "—"}g  G ${ac.glucides_g ?? "—"}g  L ${ac.lipides_g ?? "—"}g`,
    cx, b.y - 36, { font: fontReg, size: 7, color: GRAY }
  );
  b.text(
    `Fibres >= ${ac.fibres_min_g ?? 30}g  Sucres <= ${ac.sucres_max_g ?? 100}g`,
    cx, b.y - 46, { font: fontReg, size: 6.5, color: LGRAY }
  );

  b.y -= patH + 12;

  // ── RÉSUMÉ STRATÉGIE ──
  b.text("STRATEGIE NUTRITIONNELLE", ML, b.y, { font: fontBold, size: 7.5, color: GREEN });
  b.y -= 8;
  b.rect(ML, b.y - 28, CW, 28, CREAM);
  b.line(ML, b.y, ML + 3, b.y - 28, GREEN, 2);
  const resumeH = b.textWrapped(contenu.resume ?? "—", ML + 8, b.y - 7, {
    font: fontReg, size: 7, color: DARK, maxWidth: CW - 16, lineHeight: 11,
  });
  b.y -= Math.max(28, resumeH) + 14;

  // ── CADRE NUTRITIONNEL PAR REPAS ──
  b.text("CADRE NUTRITIONNEL JOURNALIER", ML, b.y, { font: fontBold, size: 7.5, color: GREEN });
  b.y -= 10;

  const colW1 = 115, colW2 = 75, colW3 = CW - colW1 - colW2;
  const cellH = 13;
  const rowHdr = 14;

  for (const rKey of ORDRE_REPAS) {
    const rData = repasJT[rKey];
    if (!rData?.groupes?.length) continue;

    // Vérifier place
    const needed = rowHdr + rData.groupes.length * cellH + 10;
    b.ensureSpace(needed);

    // En-tête repas
    b.rect(ML, b.y - rowHdr, CW, rowHdr, DARK);
    b.text(LABELS_REPAS[rKey] ?? rKey, ML + 6, b.y - 9.5, { font: fontBold, size: 8, color: WHITE });
    b.y -= rowHdr;

    // En-tête colonnes
    b.rect(ML, b.y - cellH, CW, cellH, rgb(0.239, 0.580, 0.459));
    b.text("Groupe alimentaire", ML + 6, b.y - 9,   { font: fontBold, size: 6.5, color: WHITE });
    b.text("Quantite",          ML + colW1 + 4, b.y - 9, { font: fontBold, size: 6.5, color: WHITE });
    b.text("Conseil",           ML + colW1 + colW2 + 4, b.y - 9, { font: fontBold, size: 6.5, color: WHITE });
    b.y -= cellH;

    // Lignes groupes
    for (const [gi, g] of rData.groupes.entries()) {
      const rowBg = gi % 2 === 0 ? WHITE : CREAM;
      b.rect(ML, b.y - cellH, CW, cellH, rowBg);
      b.line(ML, b.y - cellH, ML + CW, b.y - cellH, rgb(0.9, 0.94, 0.9), 0.4);

      b.text(n(g.groupe), ML + 6, b.y - 9, { font: fontBold, size: 6.5, color: DARK, maxWidth: colW1 - 10 });
      b.text(n(g.quantite_indicative ?? `${g.nb_portions} portion(s)`),
        ML + colW1 + 4, b.y - 9, { font: fontReg, size: 6.5, color: GREEN, maxWidth: colW2 - 8 });

      // Conseil : peut déborder → adapter la hauteur
      const consLines = wrapText(g.conseils_groupe ?? "", colW3 - 10, fontIta, 6.5);
      consLines.slice(0, 1).forEach(cl => {
        b.text(cl, ML + colW1 + colW2 + 4, b.y - 9, { font: fontIta, size: 6.5, color: GRAY });
      });

      b.y -= cellH;
    }
    b.y -= 6;
  }

  // ── CONSEILS (2 colonnes) ──
  b.ensureSpace(30);
  b.text("CONSEILS PERSONNALISES", ML, b.y, { font: fontBold, size: 7.5, color: GREEN });
  b.y -= 10;

  const halfW = (CW - 8) / 2;
  let leftY = b.y, rightY = b.y;
  tousConseils.forEach((conseil, i) => {
    const col = i % 2;
    const x   = col === 0 ? ML : ML + halfW + 8;
    const yPos = col === 0 ? leftY : rightY;
    b.ensureSpace(22);

    // Puce verte
    b.rect(x, yPos - 6, 3, 6, GREEN);

    const lines = wrapText(n(conseil), halfW - 10, fontReg, 6.5);
    const blockH = lines.length * 9.5 + 4;
    lines.forEach((line, li) => {
      b.text(line, x + 7, yPos - 6 - li * 9.5, { font: fontReg, size: 6.5, color: DARK });
    });

    if (col === 0) { leftY -= blockH + 5; }
    else           { rightY -= blockH + 5; }
  });
  b.y = Math.min(leftY, rightY) - 6;

  // ── Notes diét. ──
  if (contenu.notes_dieteticien) {
    b.ensureSpace(30);
    b.rect(ML, b.y - 24, CW, 24, WARN);
    b.line(ML, b.y, ML + 3, b.y - 24, rgb(0.922, 0.624, 0.043), 2.5);
    b.text("Notes du dieteticien : " + n(contenu.notes_dieteticien),
      ML + 8, b.y - 9, { font: fontReg, size: 7, color: DARK, maxWidth: CW - 16 });
    b.y -= 30;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  PAGE 2 — Tableau 7 jours × repas
  // ════════════════════════════════════════════════════════════════════════════
  b.addPage();
  b.drawWatermark();

  // Mini en-tête
  b.rect(0, H - MT - 32, W, 32 + MT, GREEN);
  b.text("NutriDoc", ML, H - MT - 20, { font: fontBold, size: 16, color: WHITE });
  b.text("7 jours de menus", ML + 100, H - MT - 20, { font: fontReg, size: 10, color: rgb(0.8, 1, 0.9) });
  b.text(
    `${n(bilan?.prenom)} ${n(bilan?.nom)}  ·  ${ac.calories ?? "—"} kcal/j  ·  ${dateStr}`,
    W - MR - 200, H - MT - 20, { font: fontReg, size: 6.5, color: rgb(0.7, 0.9, 0.8), maxWidth: 200 }
  );
  b.y = H - MT - 32 - 10;

  // ── TABLEAU ──
  const nbRepas = repasKeys.length;
  const colJour  = 52;             // colonne "Jour"
  const colTotal = 40;             // colonne "Total"
  const colRepas = (CW - colJour - colTotal) / nbRepas; // colonnes repas
  const hdrH = 18;
  const rowH = 55;                  // hauteur ligne jour

  // En-tête tableau
  b.rect(ML, b.y - hdrH, CW, hdrH, DARK);
  b.text("Jour", ML + 4, b.y - 12, { font: fontBold, size: 7.5, color: WHITE });
  b.text("Total", ML + colJour + 4, b.y - 12, { font: fontBold, size: 7, color: rgb(0.5, 1, 0.8) });
  repasKeys.forEach((rk, ri) => {
    const x = ML + colJour + colTotal + ri * colRepas;
    b.text(LABELS_REPAS[rk] ?? rk, x + 4, b.y - 12, { font: fontBold, size: 7, color: WHITE, maxWidth: colRepas - 6 });
  });
  b.y -= hdrH;

  // Lignes jours
  for (const [ji, jour] of menus.entries()) {
    // Calculer le total kcal
    let totalKcal = 0;
    Object.values(jour.repas ?? {}).forEach((r: any) => {
      (r.aliments ?? []).forEach((a: any) => { totalKcal += (a.kcal_ciqual ?? a.kcal ?? 0); });
    });
    totalKcal = Math.round(totalKcal) || jour.kcal_total || 0;

    const bg = ji % 2 === 0 ? WHITE : CREAM;
    b.rect(ML, b.y - rowH, CW, rowH, bg);
    b.line(ML, b.y - rowH, ML + CW, b.y - rowH, rgb(0.87, 0.92, 0.87), 0.5);

    // Bordure verte sur les colonnes
    b.line(ML + colJour, b.y, ML + colJour, b.y - rowH, GREEN, 1.2);
    b.line(ML + colJour + colTotal, b.y, ML + colJour + colTotal, b.y - rowH, rgb(0.8, 0.9, 0.85), 0.5);

    // Nom du jour
    b.text(n(jour.jour), ML + 4, b.y - 14, { font: fontBold, size: 9, color: DARK });

    // Total kcal
    b.text(String(totalKcal), ML + colJour + 4, b.y - 14, { font: fontBold, size: 9, color: GREEN });
    b.text("kcal", ML + colJour + 4, b.y - 23, { font: fontReg, size: 6, color: LGRAY });

    // Aliments par repas
    repasKeys.forEach((rk, ri) => {
      const x  = ML + colJour + colTotal + ri * colRepas;
      const r  = jour.repas?.[rk];
      const als = r?.aliments ?? [];
      let ay   = b.y - 10;
      let kcalRepas = 0;
      for (const a of als.slice(0, 5)) { // max 5 aliments par cellule
        kcalRepas += (a.kcal_ciqual ?? a.kcal ?? 0);
        b.text(
          n(a.nom) + " " + a.qte + (a.unite ?? "g"),
          x + 3, ay, { font: fontReg, size: 6, color: DARK, maxWidth: colRepas - 6 }
        );
        ay -= 9.5;
      }
      if (als.length > 0) {
        b.text(Math.round(kcalRepas) + " kcal", x + 3, b.y - rowH + 5, { font: fontIta, size: 5.5, color: LGRAY });
      }
    });

    b.y -= rowH;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  PAGE 3 — Attestation + Clause + Signature
  // ════════════════════════════════════════════════════════════════════════════
  b.addPage();
  b.drawWatermark();

  b.rect(0, H - MT - 28, W, 28 + MT, GREEN);
  b.text("NutriDoc", ML, H - MT - 18, { font: fontBold, size: 16, color: WHITE });
  b.text("Attestation professionnelle", ML + 100, H - MT - 18, { font: fontReg, size: 9, color: rgb(0.8, 1, 0.9) });
  b.y = H - MT - 28 - 20;

  // ── Bloc attestation ──
  b.text("ATTESTATION DU DIETETICIEN", ML, b.y, { font: fontBold, size: 9, color: GREEN });
  b.y -= 12;

  const attestTxt =
    `Je soussigne(e) ${pratNom}, dieteticien(ne) enregistre(e) sous le numero RPPS ${pratRpps}` +
    (pratCab ? ` (${pratCab})` : "") +
    `, atteste avoir consulte, verifie et valide ce plan alimentaire genere par intelligence artificielle` +
    ` (NutriDoc · GPT-4o-mini · CIQUAL 2020 · referentiels ANSES 2016).` +
    ` Ce document constitue un plan alimentaire sur-mesure etabli a partir des informations declarees` +
    ` par ${n(bilan?.prenom)} ${n(bilan?.nom)}.`;

  const attestH = 60;
  b.rect(ML, b.y - attestH, CW, attestH, LGREEN);
  b.line(ML, b.y, ML + 3, b.y - attestH, GREEN, 2.5);
  b.textWrapped(attestTxt, ML + 10, b.y - 10, { font: fontReg, size: 7.5, color: DARK, maxWidth: CW - 16, lineHeight: 12 });
  b.y -= attestH + 16;

  // ── Clause de responsabilité ──
  b.text("CLAUSE DE RESPONSABILITE", ML, b.y, { font: fontBold, size: 8, color: GRAY });
  b.y -= 10;

  const clauseTxt =
    `Ce plan alimentaire personnalise repose sur les informations fournies par le patient.` +
    ` NutriDoc et le dieteticien signataire ne peuvent garantir un resultat specifique (perte de poids,` +
    ` prise de masse, amelioration d'une pathologie, etc.).` +
    ` Les resultats obtenus dependent de la bonne observance du plan, de la volonte du patient,` +
    ` de son niveau d'activite physique reel, de son comportement alimentaire au quotidien` +
    ` et de facteurs physiologiques individuels (metabolisme, etat de sante, stress, sommeil).` +
    ` En cas de symptome inhabituel ou de doute medical, il est recommande de consulter un medecin.`;

  const clauseH = 72;
  b.rect(ML, b.y - clauseH, CW, clauseH, WARN);
  b.line(ML, b.y, ML + 3, b.y - clauseH, rgb(0.922, 0.624, 0.043), 2.5);
  b.textWrapped(clauseTxt, ML + 10, b.y - 10, { font: fontReg, size: 7.5, color: DARK, maxWidth: CW - 16, lineHeight: 12 });
  b.y -= clauseH + 20;

  // ── Bloc signature ──
  b.text("SIGNATURE", ML, b.y, { font: fontBold, size: 8, color: GRAY });
  b.y -= 12;

  const sigH = 90;
  b.rectBorder(ML, b.y - sigH, CW, sigH, WHITE, GREEN, 1.2);

  // Infos gauche
  b.text("Fait le " + dateStr, ML + 10, b.y - 16, { font: fontReg, size: 7.5, color: GRAY });
  b.text(pratNom, ML + 10, b.y - 30, { font: fontBold, size: 10, color: GDARK });
  b.text("Dieteticien(ne) · RPPS " + pratRpps, ML + 10, b.y - 42, { font: fontReg, size: 7.5, color: GRAY });
  b.text(pratCab, ML + 10, b.y - 53, { font: fontReg, size: 7, color: LGRAY });
  if (pratVille) b.text(pratVille, ML + 10, b.y - 62, { font: fontReg, size: 7, color: LGRAY });
  if (pratTel)   b.text(pratTel,   ML + 10, b.y - 71, { font: fontReg, size: 7, color: LGRAY });

  // Zone signature droite
  const sigBoxX = ML + CW - 165;
  b.rectBorder(sigBoxX, b.y - sigH + 10, 155, sigH - 20, CREAM, rgb(0.8, 0.93, 0.87), 0.8);
  b.text("Signature manuscrite :", sigBoxX + 8, b.y - 26, { font: fontReg, size: 6.5, color: LGRAY });
  b.text(dateStr, sigBoxX + 8, b.y - sigH + 18, { font: fontReg, size: 6.5, color: LGRAY });

  b.y -= sigH + 16;

  // ── Mention IA ──
  b.rect(ML, b.y - 28, CW, 28, CREAM);
  b.textWrapped(
    `Document genere par intelligence artificielle (GPT-4o-mini) et valide par ${pratNom}, ` +
    `dieteticien(ne) RPPS n° ${pratRpps}. NutriDoc · CaliDoc Sante. Document confidentiel.`,
    ML + 8, b.y - 9, { font: fontIta, size: 6.5, color: GRAY, maxWidth: CW - 16, lineHeight: 10 }
  );
  b.y -= 28;

  // ── Pied de page ──
  b.pages.forEach((page, pi) => {
    page.drawText(`NutriDoc · CaliDoc Sante · Plan personalise · Page ${pi + 1}/${b.pages.length}`, {
      x: ML, y: MB - 10, size: 6, font: fontReg, color: LGRAY,
    });
    page.drawLine({
      start: { x: ML, y: MB }, end: { x: W - MR, y: MB },
      thickness: 0.4, color: rgb(0.85, 0.92, 0.88),
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  //  UPLOAD STORAGE
  // ════════════════════════════════════════════════════════════════════════════
  const pdfBytes = await doc.save();
  const pdfUint8 = new Uint8Array(pdfBytes);

  const fileName = `${bilan?.patient_id ?? user.id}/${plan_id}.pdf`;

  const { error: uploadErr } = await sb.storage
    .from("plans-pdf")
    .upload(fileName, pdfUint8, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    console.error("[PDF] Upload Storage :", uploadErr);
    return err("Erreur upload Storage : " + uploadErr.message, 500);
  }

  // URL signée 7 jours
  const { data: signedData, error: signErr } = await sb.storage
    .from("plans-pdf")
    .createSignedUrl(fileName, 60 * 60 * 24 * 7);

  if (signErr || !signedData?.signedUrl)
    return err("Erreur URL signee : " + (signErr?.message ?? "inconnue"), 500);

  const pdfUrl = signedData.signedUrl;

  // ── Mise à jour Supabase ──────────────────────────────────────────────────
  await sb.from("plans").update({
    pdf_url:          pdfUrl,
    pdf_generated_at: new Date().toISOString(),
    statut:           "valide",
  }).eq("id", plan_id);

  // ── Email patient ─────────────────────────────────────────────────────────
  if (resendKey) {
    const { data: patientProfil } = await sb.from("profiles")
      .select("email, prenom").eq("id", bilan?.patient_id).single();

    if (patientProfil?.email) {
      await fetch("https://api.resend.com/emails", {
        method:  "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from:    "NutriDoc <noreply@nutridoc.calidoc-sante.fr>",
          to:      [patientProfil.email],
          subject: "Votre plan alimentaire NutriDoc est pret !",
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#0d2018;">
              <div style="background:#1D9E75;padding:24px 32px;border-radius:12px 12px 0 0;">
                <h1 style="color:#fff;font-size:1.5rem;margin:0;font-family:Georgia,serif;">
                  Nutri<em>Doc</em>
                </h1>
              </div>
              <div style="padding:28px 32px;background:#fff;border:1px solid #e5ece5;border-top:none;">
                <h2 style="color:#0d2018;">Bonjour ${n(patientProfil.prenom)} 👋</h2>
                <p style="color:#4b5563;line-height:1.7;">
                  Votre plan alimentaire personnalise a ete <strong>valide et signe</strong> par
                  <strong>${pratNom}</strong>, dieteticien RPPS.
                </p>
                <p style="color:#4b5563;line-height:1.7;">
                  Votre document PDF est disponible pendant <strong>7 jours</strong> via le lien ci-dessous.
                  Pensez a le sauvegarder sur votre appareil.
                </p>
                <div style="text-align:center;margin:28px 0;">
                  <a href="${pdfUrl}" style="
                    display:inline-block;padding:14px 28px;
                    background:#1D9E75;color:#fff;border-radius:10px;
                    text-decoration:none;font-weight:700;font-size:1rem;
                  ">Telecharger mon plan alimentaire PDF</a>
                </div>
                <p style="font-size:.75rem;color:#9ca3af;margin-top:20px;border-top:1px solid #e5ece5;padding-top:16px;">
                  NutriDoc by CaliDoc Sante · Ce document est confidentiel et personnalise.
                  Ne pas diffuser.
                </p>
              </div>
            </div>`,
        }),
      }).catch(e => console.error("[Email]", e));
    }
  }

  return ok({
    success: true,
    pdf_url: pdfUrl,
    pages:   b.pages.length,
    message: `PDF genere (${b.pages.length} pages) et envoye au patient.`,
  });
});
