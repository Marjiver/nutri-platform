// ============================================================
// ciqual-data.ts — NutriDoc · Table CIQUAL 2020 Anses
// Version complète pour Edge Function Supabase
// ============================================================

export const CIQUAL = {
  feculents: {
    label: "Féculents & céréales",
    color: "#f59e0b",
    icon: "🌾",
    reference: { aliment: "Riz blanc cuit", kcal: 130, qte: 100, unite: "g" },
    equivalents: [
      { aliment: "Riz blanc cuit", kcal: 130, prot: 2.7, glu: 28.2, lip: 0.3, fib: 0.4, fer: 0.2, ca: 10, vitC: 0, vitD: 0, b12: 0, mg: 12, k: 35, zn: 0.5, unite: "g", note: "cuit à l'eau" },
      { aliment: "Riz complet cuit", kcal: 123, prot: 2.9, glu: 25.8, lip: 0.9, fib: 1.8, fer: 0.8, ca: 8, vitC: 0, vitD: 0, b12: 0, mg: 43, k: 86, zn: 0.9, unite: "g", note: "cuit" },
      { aliment: "Riz basmati cuit", kcal: 135, prot: 3.1, glu: 29.5, lip: 0.4, fib: 0.5, fer: 0.3, ca: 12, vitC: 0, vitD: 0, b12: 0, mg: 15, k: 40, zn: 0.6, unite: "g", note: "cuit" },
      { aliment: "Pâtes complètes cuites", kcal: 124, prot: 5.0, glu: 25.0, lip: 0.8, fib: 4.0, fer: 1.2, ca: 15, vitC: 0, vitD: 0, b12: 0, mg: 35, k: 55, zn: 0.9, unite: "g", note: "cuits" },
      { aliment: "Pâtes blanches cuites", kcal: 131, prot: 4.5, glu: 27.5, lip: 0.6, fib: 1.5, fer: 0.8, ca: 10, vitC: 0, vitD: 0, b12: 0, mg: 18, k: 40, zn: 0.6, unite: "g", note: "cuits" },
      { aliment: "Pomme de terre vapeur", kcal: 70, prot: 1.9, glu: 14.7, lip: 0.1, fib: 1.8, fer: 0.4, ca: 7, vitC: 13, vitD: 0, b12: 0, mg: 22, k: 418, zn: 0.3, unite: "g", note: "cuite" },
      { aliment: "Pomme de terre purée (lait)", kcal: 92, prot: 2.2, glu: 15.5, lip: 2.3, fib: 1.5, fer: 0.4, ca: 35, vitC: 8, vitD: 0.1, b12: 0.1, mg: 20, k: 350, zn: 0.4, unite: "g", note: "maison" },
      { aliment: "Patate douce cuite", kcal: 76, prot: 1.4, glu: 17.7, lip: 0.1, fib: 2.5, fer: 0.5, ca: 26, vitC: 16, vitD: 0, b12: 0, mg: 20, k: 390, zn: 0.3, unite: "g", note: "cuite" },
      { aliment: "Quinoa cuit", kcal: 120, prot: 4.4, glu: 21.3, lip: 1.9, fib: 2.8, fer: 1.5, ca: 17, vitC: 0, vitD: 0, b12: 0, mg: 64, k: 172, zn: 1.1, unite: "g", note: "cuit" },
      { aliment: "Flocons d'avoine", kcal: 372, prot: 13.5, glu: 59.7, lip: 6.9, fib: 10.3, fer: 3.9, ca: 54, vitC: 0, vitD: 0, b12: 0, mg: 130, k: 362, zn: 3.6, unite: "g", note: "cru" },
      { aliment: "Muesli sans sucre", kcal: 350, prot: 10.5, glu: 62.0, lip: 5.8, fib: 8.5, fer: 3.2, ca: 45, vitC: 1, vitD: 0, b12: 0, mg: 110, k: 320, zn: 2.8, unite: "g", note: "" },
      { aliment: "Semoule cuite", kcal: 138, prot: 4.9, glu: 27.4, lip: 0.6, fib: 1.4, fer: 0.8, ca: 13, vitC: 0, vitD: 0, b12: 0, mg: 16, k: 58, zn: 0.5, unite: "g", note: "cuite" },
      { aliment: "Pain complet", kcal: 224, prot: 8.5, glu: 41.3, lip: 2.5, fib: 6.5, fer: 2.5, ca: 23, vitC: 0, vitD: 0, b12: 0, mg: 68, k: 230, zn: 1.8, unite: "g", note: "" },
      { aliment: "Pain de seigle", kcal: 210, prot: 7.8, glu: 42.0, lip: 1.5, fib: 7.2, fer: 2.2, ca: 20, vitC: 0, vitD: 0, b12: 0, mg: 55, k: 210, zn: 1.5, unite: "g", note: "" },
      { aliment: "Pain blanc baguette", kcal: 270, prot: 8.8, glu: 54.8, lip: 1.4, fib: 2.3, fer: 1.3, ca: 23, vitC: 0, vitD: 0, b12: 0, mg: 22, k: 110, zn: 0.8, unite: "g", note: "" },
      { aliment: "Pain aux céréales", kcal: 250, prot: 9.5, glu: 45.0, lip: 3.5, fib: 7.0, fer: 2.8, ca: 30, vitC: 0, vitD: 0, b12: 0, mg: 75, k: 250, zn: 2.0, unite: "g", note: "" },
      { aliment: "Boulgour cuit", kcal: 110, prot: 3.8, glu: 22.5, lip: 0.3, fib: 3.0, fer: 1.1, ca: 15, vitC: 0, vitD: 0, b12: 0, mg: 35, k: 120, zn: 0.8, unite: "g", note: "cuit" },
      { aliment: "Millet cuit", kcal: 119, prot: 3.5, glu: 23.5, lip: 1.0, fib: 1.8, fer: 0.9, ca: 8, vitC: 0, vitD: 0, b12: 0, mg: 44, k: 108, zn: 1.0, unite: "g", note: "cuit" }
    ]
  },
  proteines_animales: {
    label: "Viandes & volailles",
    color: "#ef4444",
    icon: "🥩",
    reference: { aliment: "Blanc de poulet cuit", kcal: 165, qte: 100, unite: "g" },
    equivalents: [
      { aliment: "Blanc de poulet cuit", kcal: 165, prot: 31.0, glu: 0, lip: 3.6, fib: 0, fer: 0.7, ca: 13, vitC: 0, vitD: 0.1, b12: 0.3, mg: 29, k: 280, zn: 1.0, unite: "g", note: "grillé" },
      { aliment: "Dinde cuite", kcal: 160, prot: 29.9, glu: 0, lip: 4.0, fib: 0, fer: 1.5, ca: 22, vitC: 0, vitD: 0.1, b12: 0.4, mg: 28, k: 298, zn: 3.1, unite: "g", note: "cuite" },
      { aliment: "Bœuf haché 5% MG cuit", kcal: 175, prot: 26.1, glu: 0, lip: 7.5, fib: 0, fer: 2.7, ca: 18, vitC: 0, vitD: 0.5, b12: 2.1, mg: 24, k: 318, zn: 5.4, unite: "g", note: "cuit" },
      { aliment: "Bœuf haché 15% MG cuit", kcal: 250, prot: 24.0, glu: 0, lip: 16.5, fib: 0, fer: 2.4, ca: 15, vitC: 0, vitD: 0.4, b12: 2.0, mg: 22, k: 300, zn: 4.8, unite: "g", note: "cuit" },
      { aliment: "Steak bœuf grillé", kcal: 190, prot: 28.5, glu: 0, lip: 8.0, fib: 0, fer: 2.5, ca: 12, vitC: 0, vitD: 0.3, b12: 2.2, mg: 25, k: 350, zn: 5.0, unite: "g", note: "grillé" },
      { aliment: "Veau cuit", kcal: 170, prot: 30.0, glu: 0, lip: 5.0, fib: 0, fer: 1.2, ca: 15, vitC: 0, vitD: 0.2, b12: 1.5, mg: 28, k: 320, zn: 3.0, unite: "g", note: "cuit" },
      { aliment: "Porc filet cuit", kcal: 160, prot: 28.5, glu: 0, lip: 4.5, fib: 0, fer: 1.1, ca: 10, vitC: 0, vitD: 0.3, b12: 0.8, mg: 27, k: 360, zn: 2.0, unite: "g", note: "cuit" },
      { aliment: "Agneau cuit", kcal: 210, prot: 25.0, glu: 0, lip: 12.0, fib: 0, fer: 2.0, ca: 12, vitC: 0, vitD: 0.4, b12: 2.5, mg: 24, k: 310, zn: 4.0, unite: "g", note: "cuit" },
      { aliment: "Jambon blanc dégraissé", kcal: 107, prot: 17.8, glu: 1.3, lip: 3.3, fib: 0, fer: 0.6, ca: 5, vitC: 0, vitD: 0.2, b12: 0.4, mg: 21, k: 280, zn: 1.6, unite: "g", note: "" },
      { aliment: "Jambon cru (Parme)", kcal: 250, prot: 26.0, glu: 0.5, lip: 16.0, fib: 0, fer: 1.0, ca: 10, vitC: 0, vitD: 0.2, b12: 0.5, mg: 25, k: 400, zn: 2.0, unite: "g", note: "" },
      { aliment: "Poulet rôti (cuisse)", kcal: 200, prot: 25.0, glu: 0, lip: 11.0, fib: 0, fer: 1.0, ca: 12, vitC: 0, vitD: 0.2, b12: 0.4, mg: 25, k: 260, zn: 1.5, unite: "g", note: "avec peau" },
      { aliment: "Œuf entier cuit", kcal: 155, prot: 12.4, glu: 0.6, lip: 10.6, fib: 0, fer: 1.8, ca: 50, vitC: 0, vitD: 2.0, b12: 1.3, mg: 12, k: 130, zn: 1.3, unite: "g", note: "~2 œufs" },
      { aliment: "Blanc d'œuf cuit", kcal: 48, prot: 10.9, glu: 0.7, lip: 0.2, fib: 0, fer: 0.1, ca: 7, vitC: 0, vitD: 0, b12: 0.1, mg: 11, k: 145, zn: 0.1, unite: "g", note: "" },
      { aliment: "Œuf au plat (huile)", kcal: 190, prot: 12.0, glu: 0.5, lip: 15.0, fib: 0, fer: 1.7, ca: 48, vitC: 0, vitD: 1.9, b12: 1.2, mg: 11, k: 125, zn: 1.2, unite: "g", note: "cuit avec matière grasse" },
      { aliment: "Omelette nature", kcal: 170, prot: 12.0, glu: 1.0, lip: 12.5, fib: 0, fer: 1.6, ca: 50, vitC: 0, vitD: 1.8, b12: 1.2, mg: 12, k: 130, zn: 1.2, unite: "g", note: "" }
    ]
  },
  poissons: {
    label: "Poissons & fruits de mer",
    color: "#3b82f6",
    icon: "🐟",
    reference: { aliment: "Saumon cuit", kcal: 196, qte: 100, unite: "g" },
    equivalents: [
      { aliment: "Saumon cuit", kcal: 196, prot: 27.0, glu: 0, lip: 10.0, fib: 0, fer: 0.5, ca: 14, vitC: 0, vitD: 11.0, b12: 3.2, mg: 33, k: 490, zn: 0.6, unite: "g", note: "cuit" },
      { aliment: "Saumon fumé", kcal: 180, prot: 22.5, glu: 0, lip: 10.0, fib: 0, fer: 0.6, ca: 12, vitC: 0, vitD: 10.0, b12: 3.0, mg: 30, k: 450, zn: 0.5, unite: "g", note: "" },
      { aliment: "Thon au naturel", kcal: 116, prot: 25.5, glu: 0, lip: 1.0, fib: 0, fer: 1.3, ca: 10, vitC: 0, vitD: 5.4, b12: 2.2, mg: 30, k: 237, zn: 0.7, unite: "g", note: "égoutté" },
      { aliment: "Cabillaud cuit", kcal: 96, prot: 21.2, glu: 0, lip: 0.9, fib: 0, fer: 0.4, ca: 16, vitC: 0, vitD: 1.2, b12: 1.2, mg: 38, k: 390, zn: 0.5, unite: "g", note: "cuit" },
      { aliment: "Sardines au naturel", kcal: 135, prot: 20.4, glu: 0, lip: 5.3, fib: 0, fer: 2.9, ca: 382, vitC: 0, vitD: 4.8, b12: 8.9, mg: 38, k: 397, zn: 1.3, unite: "g", note: "" },
      { aliment: "Maquereau grillé", kcal: 220, prot: 22.0, glu: 0, lip: 14.5, fib: 0, fer: 1.2, ca: 15, vitC: 0, vitD: 8.0, b12: 4.0, mg: 35, k: 400, zn: 1.0, unite: "g", note: "grillé" },
      { aliment: "Truite cuite", kcal: 190, prot: 24.0, glu: 0, lip: 10.5, fib: 0, fer: 0.8, ca: 50, vitC: 0, vitD: 12.0, b12: 3.5, mg: 32, k: 450, zn: 0.8, unite: "g", note: "cuite" },
      { aliment: "Merlu cuit", kcal: 85, prot: 18.5, glu: 0, lip: 1.0, fib: 0, fer: 0.3, ca: 15, vitC: 0, vitD: 1.0, b12: 1.0, mg: 30, k: 350, zn: 0.4, unite: "g", note: "cuit" },
      { aliment: "Crevettes cuites", kcal: 99, prot: 20.9, glu: 0.9, lip: 1.1, fib: 0, fer: 0.5, ca: 70, vitC: 0, vitD: 0, b12: 1.2, mg: 40, k: 220, zn: 1.6, unite: "g", note: "cuites" },
      { aliment: "Moules cuites", kcal: 80, prot: 12.0, glu: 3.5, lip: 1.5, fib: 0, fer: 4.0, ca: 30, vitC: 2, vitD: 0, b12: 8.0, mg: 35, k: 280, zn: 1.5, unite: "g", note: "cuites" },
      { aliment: "Calmar cuit", kcal: 120, prot: 18.0, glu: 3.5, lip: 3.5, fib: 0, fer: 0.8, ca: 30, vitC: 5, vitD: 0, b12: 1.5, mg: 35, k: 250, zn: 1.5, unite: "g", note: "cuit" },
      { aliment: "Anchois à l'huile", kcal: 210, prot: 25.0, glu: 0, lip: 12.0, fib: 0, fer: 2.0, ca: 200, vitC: 0, vitD: 3.0, b12: 2.0, mg: 40, k: 300, zn: 1.5, unite: "g", note: "" }
    ]
  },
  proteines_vegetales: {
    label: "Protéines végétales",
    color: "#22c55e",
    icon: "🌱",
    reference: { aliment: "Tofu ferme", kcal: 144, qte: 100, unite: "g" },
    equivalents: [
      { aliment: "Tofu ferme", kcal: 144, prot: 17.3, glu: 2.3, lip: 8.7, fib: 0.3, fer: 5.4, ca: 350, vitC: 0, vitD: 0, b12: 0, mg: 58, k: 121, zn: 1.6, unite: "g", note: "" },
      { aliment: "Tofu soyeux", kcal: 55, prot: 5.3, glu: 2.4, lip: 2.7, fib: 0.2, fer: 0.8, ca: 130, vitC: 0, vitD: 0, b12: 0, mg: 22, k: 101, zn: 0.5, unite: "g", note: "" },
      { aliment: "Tempeh", kcal: 192, prot: 18.5, glu: 9.4, lip: 10.8, fib: 4.1, fer: 2.7, ca: 111, vitC: 0, vitD: 0, b12: 0, mg: 81, k: 412, zn: 1.1, unite: "g", note: "" },
      { aliment: "Seitan", kcal: 142, prot: 25.0, glu: 7.0, lip: 2.0, fib: 0.3, fer: 1.9, ca: 14, vitC: 0, vitD: 0, b12: 0, mg: 16, k: 65, zn: 0.3, unite: "g", note: "" },
      { aliment: "Edamame cuit", kcal: 122, prot: 11.9, glu: 8.9, lip: 5.2, fib: 5.2, fer: 2.3, ca: 63, vitC: 6.1, vitD: 0, b12: 0, mg: 64, k: 436, zn: 1.4, unite: "g", note: "cuit" },
      { aliment: "Protéines de soja texturées", kcal: 330, prot: 50.0, glu: 10.0, lip: 2.0, fib: 15.0, fer: 8.0, ca: 200, vitC: 0, vitD: 0, b12: 0, mg: 150, k: 500, zn: 3.0, unite: "g", note: "réhydratées" },
      { aliment: "Lupin cuit", kcal: 120, prot: 13.0, glu: 7.0, lip: 4.5, fib: 5.0, fer: 2.5, ca: 50, vitC: 1, vitD: 0, b12: 0, mg: 60, k: 200, zn: 1.5, unite: "g", note: "cuit" },
      { aliment: "Quorn (mycoprotéine)", kcal: 95, prot: 14.0, glu: 3.0, lip: 2.5, fib: 5.0, fer: 0.8, ca: 20, vitC: 0, vitD: 0, b12: 0.5, mg: 25, k: 150, zn: 1.0, unite: "g", note: "" }
    ]
  },
  legumes: {
    label: "Légumes",
    color: "#10b981",
    icon: "🥬",
    reference: { aliment: "Brocolis cuits", kcal: 34, qte: 100, unite: "g" },
    equivalents: [
      { aliment: "Brocolis cuits", kcal: 34, prot: 2.8, glu: 4.0, lip: 0.4, fib: 3.3, fer: 0.8, ca: 40, vitC: 62, vitD: 0, b12: 0, mg: 18, k: 293, zn: 0.4, unite: "g", note: "cuits vapeur" },
      { aliment: "Haricots verts cuits", kcal: 30, prot: 1.8, glu: 4.3, lip: 0.2, fib: 3.4, fer: 1.0, ca: 37, vitC: 12, vitD: 0, b12: 0, mg: 25, k: 230, zn: 0.2, unite: "g", note: "cuits" },
      { aliment: "Carottes cuites", kcal: 35, prot: 0.8, glu: 7.2, lip: 0.2, fib: 2.5, fer: 0.4, ca: 30, vitC: 4, vitD: 0, b12: 0, mg: 13, k: 280, zn: 0.2, unite: "g", note: "cuites" },
      { aliment: "Carottes râpées crues", kcal: 35, prot: 0.9, glu: 6.8, lip: 0.3, fib: 2.8, fer: 0.4, ca: 33, vitC: 5, vitD: 0, b12: 0, mg: 12, k: 320, zn: 0.3, unite: "g", note: "" },
      { aliment: "Courgettes cuites", kcal: 18, prot: 1.3, glu: 2.1, lip: 0.3, fib: 1.1, fer: 0.4, ca: 18, vitC: 9, vitD: 0, b12: 0, mg: 18, k: 264, zn: 0.3, unite: "g", note: "cuites" },
      { aliment: "Épinards cuits", kcal: 23, prot: 2.9, glu: 1.6, lip: 0.4, fib: 2.4, fer: 2.2, ca: 99, vitC: 10, vitD: 0, b12: 0, mg: 57, k: 466, zn: 0.5, unite: "g", note: "cuits" },
      { aliment: "Épinards frais crus", kcal: 23, prot: 2.9, glu: 1.4, lip: 0.4, fib: 2.2, fer: 2.7, ca: 99, vitC: 28, vitD: 0, b12: 0, mg: 79, k: 558, zn: 0.5, unite: "g", note: "" },
      { aliment: "Poivron rouge cuit", kcal: 27, prot: 0.9, glu: 4.7, lip: 0.3, fib: 1.9, fer: 0.4, ca: 10, vitC: 81, vitD: 0, b12: 0, mg: 14, k: 211, zn: 0.2, unite: "g", note: "cuit" },
      { aliment: "Poivron jaune cru", kcal: 30, prot: 1.0, glu: 5.5, lip: 0.3, fib: 2.0, fer: 0.4, ca: 10, vitC: 150, vitD: 0, b12: 0, mg: 12, k: 210, zn: 0.2, unite: "g", note: "" },
      { aliment: "Tomate crue", kcal: 18, prot: 0.9, glu: 3.1, lip: 0.2, fib: 1.2, fer: 0.3, ca: 10, vitC: 14, vitD: 0, b12: 0, mg: 11, k: 237, zn: 0.2, unite: "g", note: "" },
      { aliment: "Tomates cerises", kcal: 25, prot: 1.0, glu: 4.5, lip: 0.3, fib: 1.5, fer: 0.4, ca: 12, vitC: 20, vitD: 0, b12: 0, mg: 12, k: 250, zn: 0.2, unite: "g", note: "" },
      { aliment: "Concombre", kcal: 15, prot: 0.6, glu: 2.5, lip: 0.1, fib: 0.7, fer: 0.2, ca: 16, vitC: 3, vitD: 0, b12: 0, mg: 13, k: 140, zn: 0.2, unite: "g", note: "" },
      { aliment: "Salade verte (mâche)", kcal: 21, prot: 2.0, glu: 1.5, lip: 0.5, fib: 2.0, fer: 2.0, ca: 38, vitC: 25, vitD: 0, b12: 0, mg: 38, k: 450, zn: 0.4, unite: "g", note: "" },
      { aliment: "Laitue", kcal: 15, prot: 1.4, glu: 1.5, lip: 0.2, fib: 1.3, fer: 0.9, ca: 36, vitC: 5, vitD: 0, b12: 0, mg: 13, k: 194, zn: 0.2, unite: "g", note: "" },
      { aliment: "Champignons cuits", kcal: 26, prot: 2.2, glu: 2.3, lip: 0.7, fib: 1.5, fer: 0.5, ca: 5, vitC: 2, vitD: 0.1, b12: 0, mg: 12, k: 356, zn: 0.5, unite: "g", note: "cuits" },
      { aliment: "Champignons de Paris crus", kcal: 22, prot: 3.1, glu: 1.5, lip: 0.5, fib: 1.5, fer: 0.6, ca: 4, vitC: 2, vitD: 0.2, b12: 0, mg: 10, k: 320, zn: 0.8, unite: "g", note: "" },
      { aliment: "Aubergine cuite", kcal: 28, prot: 1.0, glu: 4.7, lip: 0.2, fib: 2.5, fer: 0.3, ca: 12, vitC: 1, vitD: 0, b12: 0, mg: 14, k: 230, zn: 0.2, unite: "g", note: "cuite" },
      { aliment: "Poireau cuit", kcal: 27, prot: 1.5, glu: 3.9, lip: 0.3, fib: 1.9, fer: 1.1, ca: 30, vitC: 7, vitD: 0, b12: 0, mg: 14, k: 180, zn: 0.2, unite: "g", note: "cuit" },
      { aliment: "Céleri branche cuit", kcal: 12, prot: 0.7, glu: 2.0, lip: 0.1, fib: 1.5, fer: 0.3, ca: 40, vitC: 4, vitD: 0, b12: 0, mg: 10, k: 260, zn: 0.1, unite: "g", note: "cuit" },
      { aliment: "Betterave cuite", kcal: 45, prot: 1.6, glu: 8.5, lip: 0.2, fib: 2.5, fer: 0.8, ca: 15, vitC: 3, vitD: 0, b12: 0, mg: 23, k: 300, zn: 0.4, unite: "g", note: "cuite" },
      { aliment: "Fenouil cuit", kcal: 25, prot: 1.2, glu: 4.0, lip: 0.2, fib: 2.5, fer: 0.5, ca: 50, vitC: 12, vitD: 0, b12: 0, mg: 15, k: 400, zn: 0.2, unite: "g", note: "cuit" },
      { aliment: "Chou-fleur cuit", kcal: 25, prot: 2.0, glu: 3.5, lip: 0.3, fib: 2.5, fer: 0.5, ca: 25, vitC: 45, vitD: 0, b12: 0, mg: 15, k: 300, zn: 0.3, unite: "g", note: "cuit" }
    ]
  },
  fruits: {
    label: "Fruits",
    color: "#f97316",
    icon: "🍎",
    reference: { aliment: "Pomme", kcal: 52, qte: 100, unite: "g" },
    equivalents: [
      { aliment: "Pomme", kcal: 52, prot: 0.3, glu: 12.8, lip: 0.2, fib: 2.4, fer: 0.1, ca: 6, vitC: 5, vitD: 0, b12: 0, mg: 5, k: 107, zn: 0.0, unite: "g", note: "" },
      { aliment: "Banane", kcal: 89, prot: 1.1, glu: 20.2, lip: 0.3, fib: 2.6, fer: 0.3, ca: 5, vitC: 9, vitD: 0, b12: 0, mg: 27, k: 358, zn: 0.2, unite: "g", note: "" },
      { aliment: "Orange", kcal: 47, prot: 0.9, glu: 9.4, lip: 0.1, fib: 2.4, fer: 0.1, ca: 40, vitC: 53, vitD: 0, b12: 0, mg: 10, k: 181, zn: 0.1, unite: "g", note: "" },
      { aliment: "Clémentine", kcal: 47, prot: 0.9, glu: 9.8, lip: 0.2, fib: 1.8, fer: 0.2, ca: 30, vitC: 48, vitD: 0, b12: 0, mg: 10, k: 170, zn: 0.1, unite: "g", note: "" },
      { aliment: "Pamplemousse", kcal: 42, prot: 0.8, glu: 8.5, lip: 0.1, fib: 1.6, fer: 0.1, ca: 20, vitC: 40, vitD: 0, b12: 0, mg: 8, k: 150, zn: 0.1, unite: "g", note: "" },
      { aliment: "Fraises", kcal: 32, prot: 0.7, glu: 5.7, lip: 0.3, fib: 2.0, fer: 0.4, ca: 16, vitC: 59, vitD: 0, b12: 0, mg: 13, k: 154, zn: 0.1, unite: "g", note: "" },
      { aliment: "Framboises", kcal: 52, prot: 1.2, glu: 5.5, lip: 0.7, fib: 6.5, fer: 0.7, ca: 25, vitC: 25, vitD: 0, b12: 0, mg: 20, k: 150, zn: 0.3, unite: "g", note: "" },
      { aliment: "Myrtilles", kcal: 57, prot: 0.7, glu: 12.1, lip: 0.3, fib: 2.4, fer: 0.3, ca: 6, vitC: 10, vitD: 0, b12: 0, mg: 6, k: 77, zn: 0.2, unite: "g", note: "" },
      { aliment: "Kiwi", kcal: 61, prot: 1.1, glu: 11.7, lip: 0.6, fib: 3.0, fer: 0.3, ca: 34, vitC: 93, vitD: 0, b12: 0, mg: 17, k: 312, zn: 0.1, unite: "g", note: "" },
      { aliment: "Mangue", kcal: 65, prot: 0.6, glu: 14.8, lip: 0.4, fib: 1.8, fer: 0.2, ca: 11, vitC: 28, vitD: 0, b12: 0, mg: 10, k: 168, zn: 0.1, unite: "g", note: "" },
      { aliment: "Ananas", kcal: 55, prot: 0.5, glu: 12.5, lip: 0.2, fib: 1.4, fer: 0.3, ca: 13, vitC: 15, vitD: 0, b12: 0, mg: 12, k: 150, zn: 0.1, unite: "g", note: "" },
      { aliment: "Poire", kcal: 57, prot: 0.4, glu: 13.5, lip: 0.1, fib: 2.2, fer: 0.2, ca: 9, vitC: 4, vitD: 0, b12: 0, mg: 7, k: 119, zn: 0.1, unite: "g", note: "" },
      { aliment: "Raisin", kcal: 69, prot: 0.6, glu: 16.0, lip: 0.2, fib: 1.0, fer: 0.3, ca: 10, vitC: 3, vitD: 0, b12: 0, mg: 7, k: 191, zn: 0.1, unite: "g", note: "" },
      { aliment: "Pêche", kcal: 43, prot: 0.9, glu: 9.5, lip: 0.3, fib: 1.5, fer: 0.3, ca: 6, vitC: 6, vitD: 0, b12: 0, mg: 9, k: 190, zn: 0.1, unite: "g", note: "" },
      { aliment: "Abricot", kcal: 48, prot: 1.0, glu: 9.5, lip: 0.4, fib: 2.0, fer: 0.4, ca: 13, vitC: 10, vitD: 0, b12: 0, mg: 8, k: 280, zn: 0.1, unite: "g", note: "" },
      { aliment: "Melon", kcal: 34, prot: 0.9, glu: 7.5, lip: 0.2, fib: 0.9, fer: 0.2, ca: 9, vitC: 20, vitD: 0, b12: 0, mg: 12, k: 267, zn: 0.1, unite: "g", note: "" },
      { aliment: "Pastèque", kcal: 30, prot: 0.6, glu: 7.0, lip: 0.2, fib: 0.4, fer: 0.2, ca: 7, vitC: 8, vitD: 0, b12: 0, mg: 10, k: 112, zn: 0.1, unite: "g", note: "" },
      { aliment: "Compote sans sucre", kcal: 48, prot: 0.3, glu: 11.5, lip: 0.1, fib: 1.9, fer: 0.1, ca: 5, vitC: 2, vitD: 0, b12: 0, mg: 4, k: 90, zn: 0.0, unite: "g", note: "" }
    ]
  },
  legumineuses: {
    label: "Légumineuses",
    color: "#8b5cf6",
    icon: "🫘",
    reference: { aliment: "Lentilles cuites", kcal: 116, qte: 100, unite: "g" },
    equivalents: [
      { aliment: "Lentilles cuites", kcal: 116, prot: 9.0, glu: 17.5, lip: 0.4, fib: 7.9, fer: 3.3, ca: 19, vitC: 1.5, vitD: 0, b12: 0, mg: 36, k: 369, zn: 1.3, unite: "g", note: "cuites" },
      { aliment: "Lentilles corail cuites", kcal: 100, prot: 8.5, glu: 15.0, lip: 0.5, fib: 6.0, fer: 3.0, ca: 20, vitC: 1, vitD: 0, b12: 0, mg: 35, k: 350, zn: 1.2, unite: "g", note: "cuites" },
      { aliment: "Pois chiches cuits", kcal: 164, prot: 8.9, glu: 22.5, lip: 4.0, fib: 7.6, fer: 2.9, ca: 49, vitC: 0, vitD: 0, b12: 0, mg: 48, k: 291, zn: 1.5, unite: "g", note: "cuits" },
      { aliment: "Haricots rouges cuits", kcal: 100, prot: 6.9, glu: 13.7, lip: 0.5, fib: 8.7, fer: 2.0, ca: 28, vitC: 0, vitD: 0, b12: 0, mg: 45, k: 340, zn: 1.0, unite: "g", note: "cuits" },
      { aliment: "Haricots blancs cuits", kcal: 110, prot: 7.5, glu: 15.0, lip: 0.6, fib: 7.0, fer: 2.5, ca: 50, vitC: 0, vitD: 0, b12: 0, mg: 50, k: 350, zn: 1.2, unite: "g", note: "cuits" },
      { aliment: "Pois cassés cuits", kcal: 110, prot: 8.0, glu: 16.0, lip: 0.5, fib: 6.5, fer: 2.0, ca: 20, vitC: 0, vitD: 0, b12: 0, mg: 30, k: 300, zn: 1.0, unite: "g", note: "cuits" },
      { aliment: "Fèves cuites", kcal: 90, prot: 7.0, glu: 12.0, lip: 0.5, fib: 6.0, fer: 1.8, ca: 25, vitC: 1, vitD: 0, b12: 0, mg: 40, k: 280, zn: 1.0, unite: "g", note: "cuites" }
    ]
  },
  laitiers: {
    label: "Produits laitiers",
    color: "#60a5fa",
    icon: "🥛",
    reference: { aliment: "Yaourt nature", kcal: 65, qte: 100, unite: "g" },
    equivalents: [
      { aliment: "Yaourt nature", kcal: 65, prot: 3.9, glu: 5.2, lip: 3.4, fib: 0, fer: 0.1, ca: 120, vitC: 0, vitD: 0.1, b12: 0.4, mg: 11, k: 155, zn: 0.5, unite: "g", note: "" },
      { aliment: "Yaourt grec nature", kcal: 115, prot: 9.0, glu: 4.1, lip: 7.0, fib: 0, fer: 0, ca: 110, vitC: 0, vitD: 0.1, b12: 0.5, mg: 11, k: 141, zn: 0.5, unite: "g", note: "" },
      { aliment: "Yaourt végétal soja", kcal: 55, prot: 3.5, glu: 4.5, lip: 2.5, fib: 0.5, fer: 0.4, ca: 120, vitC: 0, vitD: 1.0, b12: 0.4, mg: 13, k: 120, zn: 0.3, unite: "g", note: "" },
      { aliment: "Fromage blanc 0%", kcal: 45, prot: 8.0, glu: 4.0, lip: 0.2, fib: 0, fer: 0.1, ca: 118, vitC: 0, vitD: 0, b12: 0.3, mg: 8, k: 130, zn: 0.5, unite: "g", note: "" },
      { aliment: "Fromage blanc 3%", kcal: 80, prot: 7.5, glu: 3.5, lip: 3.5, fib: 0, fer: 0.1, ca: 115, vitC: 0, vitD: 0.1, b12: 0.3, mg: 8, k: 130, zn: 0.5, unite: "g", note: "" },
      { aliment: "Skyr (yaourt islandais)", kcal: 60, prot: 10.0, glu: 4.0, lip: 0.2, fib: 0, fer: 0, ca: 100, vitC: 0, vitD: 0, b12: 0.5, mg: 10, k: 150, zn: 0.5, unite: "g", note: "" },
      { aliment: "Lait demi-écrémé", kcal: 46, prot: 3.3, glu: 4.8, lip: 1.6, fib: 0, fer: 0, ca: 120, vitC: 0, vitD: 0.1, b12: 0.5, mg: 11, k: 150, zn: 0.4, unite: "ml", note: "" },
      { aliment: "Lait entier", kcal: 64, prot: 3.3, glu: 4.8, lip: 3.6, fib: 0, fer: 0, ca: 120, vitC: 0, vitD: 0.2, b12: 0.5, mg: 11, k: 150, zn: 0.4, unite: "ml", note: "" },
      { aliment: "Lait végétal soja", kcal: 44, prot: 3.3, glu: 2.7, lip: 1.8, fib: 0, fer: 0.4, ca: 120, vitC: 0, vitD: 1.0, b12: 0.4, mg: 13, k: 118, zn: 0.3, unite: "ml", note: "" },
      { aliment: "Lait végétal amande", kcal: 25, prot: 0.5, glu: 1.0, lip: 2.0, fib: 0.5, fer: 0.2, ca: 120, vitC: 0, vitD: 0.5, b12: 0.2, mg: 8, k: 50, zn: 0.1, unite: "ml", note: "" },
      { aliment: "Lait végétal avoine", kcal: 45, prot: 1.0, glu: 7.0, lip: 1.5, fib: 0.8, fer: 0.3, ca: 120, vitC: 0, vitD: 0.5, b12: 0.2, mg: 10, k: 80, zn: 0.2, unite: "ml", note: "" },
      { aliment: "Emmental râpé", kcal: 380, prot: 28.0, glu: 0.5, lip: 29.0, fib: 0, fer: 0.4, ca: 1100, vitC: 0, vitD: 0.4, b12: 1.5, mg: 44, k: 77, zn: 4.0, unite: "g", note: "" },
      { aliment: "Parmesan", kcal: 392, prot: 32.0, glu: 0, lip: 28.0, fib: 0, fer: 0.5, ca: 1200, vitC: 0, vitD: 0.3, b12: 1.2, mg: 40, k: 80, zn: 3.5, unite: "g", note: "" },
      { aliment: "Feta", kcal: 264, prot: 14.2, glu: 4.1, lip: 21.3, fib: 0, fer: 0.7, ca: 493, vitC: 0, vitD: 0.1, b12: 1.2, mg: 19, k: 62, zn: 2.9, unite: "g", note: "" },
      { aliment: "Mozzarella", kcal: 250, prot: 18.0, glu: 1.0, lip: 19.0, fib: 0, fer: 0.3, ca: 500, vitC: 0, vitD: 0.2, b12: 1.0, mg: 20, k: 50, zn: 2.0, unite: "g", note: "" }
    ]
  },
  matieres_grasses: {
    label: "Matières grasses",
    color: "#a78bfa",
    icon: "🫒",
    reference: { aliment: "Huile d'olive", kcal: 884, qte: 100, unite: "ml" },
    equivalents: [
      { aliment: "Huile d'olive", kcal: 884, prot: 0, glu: 0, lip: 99.9, fib: 0, fer: 0.6, ca: 1, vitC: 0, vitD: 0, b12: 0, mg: 0, k: 1, zn: 0, unite: "ml", note: "1cs=9g=80kcal" },
      { aliment: "Huile de colza", kcal: 884, prot: 0, glu: 0, lip: 99.9, fib: 0, fer: 0, ca: 0, vitC: 0, vitD: 0, b12: 0, mg: 0, k: 0, zn: 0, unite: "ml", note: "1cs=9g=80kcal" },
      { aliment: "Huile de coco", kcal: 884, prot: 0, glu: 0, lip: 99.9, fib: 0, fer: 0, ca: 1, vitC: 0, vitD: 0, b12: 0, mg: 0, k: 0, zn: 0, unite: "ml", note: "" },
      { aliment: "Huile de sésame", kcal: 884, prot: 0, glu: 0, lip: 99.9, fib: 0, fer: 0.1, ca: 1, vitC: 0, vitD: 0, b12: 0, mg: 0, k: 0, zn: 0, unite: "ml", note: "" },
      { aliment: "Beurre", kcal: 745, prot: 0.6, glu: 0.6, lip: 82.0, fib: 0, fer: 0, ca: 15, vitC: 0, vitD: 1.5, b12: 0.1, mg: 2, k: 26, zn: 0.1, unite: "g", note: "1cs=15g=112kcal" },
      { aliment: "Beurre allégé (41%)", kcal: 370, prot: 0.5, glu: 0.5, lip: 41.0, fib: 0, fer: 0, ca: 10, vitC: 0, vitD: 0.8, b12: 0.05, mg: 1, k: 15, zn: 0.05, unite: "g", note: "" },
      { aliment: "Margarine végétale", kcal: 720, prot: 0, glu: 0, lip: 80.0, fib: 0, fer: 0, ca: 10, vitC: 0, vitD: 5.0, b12: 0, mg: 1, k: 10, zn: 0, unite: "g", note: "" },
      { aliment: "Avocat", kcal: 160, prot: 2.0, glu: 1.8, lip: 15.4, fib: 6.7, fer: 0.6, ca: 12, vitC: 10, vitD: 0, b12: 0, mg: 29, k: 485, zn: 0.6, unite: "g", note: "" },
      { aliment: "Amandes", kcal: 579, prot: 21.2, glu: 6.9, lip: 49.9, fib: 12.5, fer: 3.7, ca: 264, vitC: 0, vitD: 0, b12: 0, mg: 270, k: 733, zn: 3.1, unite: "g", note: "" },
      { aliment: "Noix", kcal: 654, prot: 15.2, glu: 2.6, lip: 65.2, fib: 6.7, fer: 2.9, ca: 98, vitC: 1, vitD: 0, b12: 0, mg: 158, k: 441, zn: 3.1, unite: "g", note: "" },
      { aliment: "Noisettes", kcal: 628, prot: 15.0, glu: 7.0, lip: 60.0, fib: 10.0, fer: 3.5, ca: 150, vitC: 0, vitD: 0, b12: 0, mg: 160, k: 500, zn: 2.5, unite: "g", note: "" },
      { aliment: "Noix de cajou", kcal: 553, prot: 18.0, glu: 30.0, lip: 43.0, fib: 3.5, fer: 6.0, ca: 37, vitC: 0, vitD: 0, b12: 0, mg: 260, k: 660, zn: 5.6, unite: "g", note: "" },
      { aliment: "Beurre de cacahuète", kcal: 598, prot: 24.1, glu: 20.0, lip: 51.0, fib: 6.0, fer: 1.9, ca: 49, vitC: 0, vitD: 0, b12: 0, mg: 170, k: 649, zn: 2.9, unite: "g", note: "" },
      { aliment: "Graines de chia", kcal: 486, prot: 16.5, glu: 42.1, lip: 30.7, fib: 34.4, fer: 7.7, ca: 631, vitC: 0, vitD: 0, b12: 0, mg: 335, k: 407, zn: 4.6, unite: "g", note: "" }
    ]
  },
  boissons: {
    label: "Boissons",
    color: "#38bdf8",
    icon: "💧",
    reference: { aliment: "Eau", kcal: 0, qte: 100, unite: "ml" },
    equivalents: [
      { aliment: "Eau", kcal: 0, prot: 0, glu: 0, lip: 0, fib: 0, fer: 0, ca: 0, vitC: 0, vitD: 0, b12: 0, mg: 0, k: 0, zn: 0, unite: "ml", note: "" },
      { aliment: "Eau gazeuse", kcal: 0, prot: 0, glu: 0, lip: 0, fib: 0, fer: 0, ca: 50, vitC: 0, vitD: 0, b12: 0, mg: 10, k: 10, zn: 0, unite: "ml", note: "" },
      { aliment: "Jus d'orange pressé", kcal: 45, prot: 0.7, glu: 9.9, lip: 0.2, fib: 0.2, fer: 0.2, ca: 11, vitC: 40, vitD: 0, b12: 0, mg: 11, k: 200, zn: 0.1, unite: "ml", note: "" },
      { aliment: "Jus de pomme", kcal: 46, prot: 0.1, glu: 11.0, lip: 0.1, fib: 0.1, fer: 0.2, ca: 7, vitC: 1, vitD: 0, b12: 0, mg: 5, k: 101, zn: 0.0, unite: "ml", note: "" },
      { aliment: "Jus multifruits", kcal: 48, prot: 0.4, glu: 11.0, lip: 0.1, fib: 0.2, fer: 0.2, ca: 8, vitC: 12, vitD: 0, b12: 0, mg: 8, k: 120, zn: 0.1, unite: "ml", note: "" },
      { aliment: "Smoothie maison", kcal: 70, prot: 1.5, glu: 14.0, lip: 1.0, fib: 2.0, fer: 0.5, ca: 30, vitC: 30, vitD: 0, b12: 0, mg: 20, k: 250, zn: 0.3, unite: "ml", note: "fruits+lait" },
      { aliment: "Thé sans sucre", kcal: 1, prot: 0, glu: 0, lip: 0, fib: 0, fer: 0, ca: 0, vitC: 0, vitD: 0, b12: 0, mg: 1, k: 10, zn: 0, unite: "ml", note: "" },
      { aliment: "Café noir", kcal: 1, prot: 0.1, glu: 0, lip: 0, fib: 0, fer: 0, ca: 2, vitC: 0, vitD: 0, b12: 0, mg: 5, k: 50, zn: 0, unite: "ml", note: "" }
    ]
  },
  epices: {
    label: "Épices & condiments",
    color: "#f43f5e",
    icon: "🧂",
    reference: { aliment: "Sel", kcal: 0, qte: 100, unite: "g" },
    equivalents: [
      { aliment: "Sel", kcal: 0, prot: 0, glu: 0, lip: 0, fib: 0, fer: 0.1, ca: 24, vitC: 0, vitD: 0, b12: 0, mg: 1, k: 8, zn: 0, unite: "g", note: "à limiter" },
      { aliment: "Poivre noir", kcal: 251, prot: 10.4, glu: 64.0, lip: 3.3, fib: 25.0, fer: 9.7, ca: 443, vitC: 0, vitD: 0, b12: 0, mg: 171, k: 1329, zn: 1.2, unite: "g", note: "" },
      { aliment: "Curcuma", kcal: 354, prot: 7.8, glu: 65.0, lip: 9.9, fib: 21.0, fer: 41.4, ca: 183, vitC: 26, vitD: 0, b12: 0, mg: 193, k: 2525, zn: 4.4, unite: "g", note: "" },
      { aliment: "Cannelle", kcal: 247, prot: 4.0, glu: 80.0, lip: 1.2, fib: 53.0, fer: 8.3, ca: 1002, vitC: 0, vitD: 0, b12: 0, mg: 60, k: 431, zn: 1.8, unite: "g", note: "" },
      { aliment: "Paprika", kcal: 282, prot: 14.0, glu: 55.0, lip: 13.0, fib: 34.0, fer: 21.1, ca: 229, vitC: 0, vitD: 0, b12: 0, mg: 178, k: 2280, zn: 2.4, unite: "g", note: "" },
      { aliment: "Cumin", kcal: 375, prot: 17.8, glu: 44.2, lip: 22.3, fib: 10.5, fer: 66.4, ca: 931, vitC: 7.7, vitD: 0, b12: 0, mg: 366, k: 1788, zn: 4.8, unite: "g", note: "" },
      { aliment: "Gingembre", kcal: 80, prot: 1.8, glu: 17.8, lip: 0.8, fib: 2.0, fer: 0.6, ca: 16, vitC: 5, vitD: 0, b12: 0, mg: 43, k: 415, zn: 0.3, unite: "g", note: "" },
      { aliment: "Ail", kcal: 149, prot: 6.4, glu: 33.1, lip: 0.5, fib: 2.1, fer: 1.7, ca: 181, vitC: 31, vitD: 0, b12: 0, mg: 25, k: 401, zn: 1.2, unite: "g", note: "" },
      { aliment: "Oignon", kcal: 40, prot: 1.1, glu: 8.0, lip: 0.1, fib: 1.7, fer: 0.2, ca: 23, vitC: 7, vitD: 0, b12: 0, mg: 10, k: 146, zn: 0.2, unite: "g", note: "" },
      { aliment: "Levure maltée", kcal: 310, prot: 45.0, glu: 25.0, lip: 5.0, fib: 20.0, fer: 5.0, ca: 30, vitC: 0, vitD: 0, b12: 10.0, mg: 100, k: 800, zn: 3.0, unite: "g", note: "riche en B12" }
    ]
  },
  plats_prepares: {
    label: "Plats préparés",
    color: "#ec489a",
    icon: "🍲",
    reference: { aliment: "Pizza margherita", kcal: 260, qte: 100, unite: "g" },
    equivalents: [
      { aliment: "Pizza margherita", kcal: 260, prot: 11.0, glu: 30.0, lip: 11.0, fib: 2.0, fer: 1.2, ca: 200, vitC: 2, vitD: 0.1, b12: 0.5, mg: 25, k: 150, zn: 1.0, unite: "g", note: "industrielle" },
      { aliment: "Burger (pain+steak)", kcal: 280, prot: 16.0, glu: 25.0, lip: 13.0, fib: 1.5, fer: 2.0, ca: 100, vitC: 1, vitD: 0.1, b12: 1.0, mg: 30, k: 250, zn: 2.0, unite: "g", note: "environ 200g" },
      { aliment: "Sushi (1 pièce)", kcal: 45, prot: 2.0, glu: 8.0, lip: 0.5, fib: 0.5, fer: 0.2, ca: 5, vitC: 0, vitD: 0.1, b12: 0.1, mg: 8, k: 30, zn: 0.2, unite: "g", note: "" },
      { aliment: "Poké bowl (végé)", kcal: 150, prot: 7.0, glu: 20.0, lip: 5.0, fib: 3.0, fer: 1.5, ca: 40, vitC: 15, vitD: 0, b12: 0, mg: 35, k: 300, zn: 0.8, unite: "g", note: "végétarien" },
      { aliment: "Falafels (3 pièces)", kcal: 170, prot: 7.0, glu: 15.0, lip: 9.0, fib: 4.0, fer: 1.5, ca: 30, vitC: 2, vitD: 0, b12: 0, mg: 30, k: 200, zn: 0.8, unite: "g", note: "cuits au four" },
      { aliment: "Barre protéinée", kcal: 380, prot: 25.0, glu: 35.0, lip: 15.0, fib: 8.0, fer: 2.0, ca: 150, vitC: 0, vitD: 0, b12: 1.0, mg: 80, k: 300, zn: 2.0, unite: "g", note: "type protein bar" }
    ]
  }
};

// ==================== GROUPES LIST ====================
export const GROUPES_LIST = Object.entries(CIQUAL).map(([k, v]) => ({
  key: k,
  label: v.label,
  icon: v.icon,
  color: v.color
}));

// ==================== FONCTIONS UTILITAIRES ====================

export function detecterGroupe(nomAliment: string): string | null {
  if (!nomAliment) return null;
  const n = nomAliment.toLowerCase();
  
  if (/riz|pât|pasta|pomme de terre|patate|quinoa|pain|lentill|pois chich|haricot rouge|semoule|flocon|soba|millet|boulgour|muesli/.test(n)) return 'feculents';
  if (/poulet|dinde|bœuf|boeuf|porc|veau|agneau|jambon|steak|œuf|oeuf|blanc d'œuf|omelette/.test(n)) return 'proteines_animales';
  if (/saumon|thon|cabillaud|sardine|maquereau|truite|merlu|crevette|moule|calmar|anchois/.test(n)) return 'poissons';
  if (/tofu|tempeh|seitan|edamame|lupin|quorn/.test(n)) return 'proteines_vegetales';
  if (/brocoli|haricot vert|carotte|courgette|épinard|poivron|tomate|concombre|salade|laitue|champignon|aubergine|poireau|fenouil|chou-fleur|betterave|mâche/.test(n)) return 'legumes';
  if (/pomme|banane|orange|clémentine|pamplemousse|fraise|framboise|myrtille|kiwi|mangue|ananas|poire|raisin|pêche|abricot|melon|pastèque|compote/.test(n)) return 'fruits';
  if (/lentilles corail|pois chiche|haricot blanc|haricot rouge|fève|pois cassé/.test(n)) return 'legumineuses';
  if (/yaourt|fromage blanc|skyr|lait|emmental|parmesan|feta|mozzarella/.test(n)) return 'laitiers';
  if (/huile|beurre|margarine|avocat|amande|noix|noisette|cajou|beurre de cacahuète|chia/.test(n)) return 'matieres_grasses';
  if (/eau|jus|thé|café|smoothie/.test(n)) return 'boissons';
  if (/sel|poivre|curcuma|cannelle|paprika|cumin|gingembre|ail|oignon|levure/.test(n)) return 'epices';
  if (/pizza|burger|sushi|poke|falafel|barre protéinée/.test(n)) return 'plats_prepares';
  
  return null;
}

export function getMacrosMicros(nomAliment: string, qte: number) {
  if (!nomAliment) return null;
  const n = nomAliment.toLowerCase();
  
  for (const grp of Object.values(CIQUAL)) {
    for (const eq of grp.equivalents) {
      if (eq.aliment.toLowerCase() === n) {
        const f = qte / 100;
        return {
          prot: +(eq.prot * f).toFixed(1),
          glu: +(eq.glu * f).toFixed(1),
          lip: +(eq.lip * f).toFixed(1),
          fib: +(eq.fib * f).toFixed(1),
          fer: +(eq.fer * f).toFixed(1),
          ca: Math.round(eq.ca * f),
          vitC: Math.round(eq.vitC * f),
          vitD: +(eq.vitD * f).toFixed(1),
          b12: +(eq.b12 * f).toFixed(1),
          mg: Math.round(eq.mg * f),
          k: Math.round(eq.k * f),
          zn: +(eq.zn * f).toFixed(1)
        };
      }
    }
  }
  return null;
}

export function kcalPour(nomAliment: string, qte: number): number | null {
  if (!nomAliment) return null;
  const n = nomAliment.toLowerCase();
  
  for (const grp of Object.values(CIQUAL)) {
    for (const eq of grp.equivalents) {
      if (eq.aliment.toLowerCase() === n) {
        return Math.round(eq.kcal * qte / 100);
      }
    }
  }
  return null;
}

export function rechercherAliment(recherche: string) {
  if (!recherche || recherche.length < 2) return [];
  const term = recherche.toLowerCase();
  const results: any[] = [];
  
  for (const [groupeKey, groupe] of Object.entries(CIQUAL)) {
    for (const eq of groupe.equivalents) {
      if (eq.aliment.toLowerCase().includes(term)) {
        results.push({
          nom: eq.aliment,
          groupe: groupe.label,
          groupeKey: groupeKey,
          kcal: eq.kcal,
          prot: eq.prot,
          glu: eq.glu,
          lip: eq.lip,
          unite: eq.unite,
          note: eq.note || ""
        });
      }
    }
  }
  return results.slice(0, 20);
}