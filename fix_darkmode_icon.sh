#!/bin/bash
echo "🔧 Correction du bouton dark mode (icône seulement)..."

for file in *.html; do
    echo "Traitement de $file..."
    
    # Remplacer le bouton existant par la version icône seulement
    sed -i 's|<button id="themeHeaderBtn"[^>]*>.*</button>|<button id="themeHeaderBtn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:999px;padding:8px 12px;cursor:pointer;color:#fff;font-size:18px;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s">\n        <span id="themeIcon">🌙</span>\n      </button>|' "$file"
    
    # Si le bouton n'existe pas, l'ajouter
    if ! grep -q 'themeHeaderBtn' "$file"; then
        sed -i '/<div class="header-actions">/a\
      <button id="themeHeaderBtn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:999px;padding:8px 12px;cursor:pointer;color:#fff;font-size:18px;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s">\
        <span id="themeIcon">🌙</span>\
      </button>' "$file"
    fi
    
    # Mettre à jour le script JavaScript
    sed -i '/toggleDarkMode/,/<\/script>/c\
<script>\
(function() {\
  const btn = document.getElementById("themeHeaderBtn");\
  const iconSpan = document.getElementById("themeIcon");\
  const saved = localStorage.getItem("nutridoc_theme");\
  \
  if (saved === "dark") {\
    document.documentElement.setAttribute("data-theme", "dark");\
    if (iconSpan) iconSpan.textContent = "☀️";\
  } else {\
    document.documentElement.setAttribute("data-theme", "light");\
    if (iconSpan) iconSpan.textContent = "🌙";\
    localStorage.setItem("nutridoc_theme", "light");\
  }\
  \
  if (btn) {\
    btn.onclick = function() {\
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";\
      if (isDark) {\
        document.documentElement.setAttribute("data-theme", "light");\
        localStorage.setItem("nutridoc_theme", "light");\
        if (iconSpan) iconSpan.textContent = "🌙";\
      } else {\
        document.documentElement.setAttribute("data-theme", "dark");\
        localStorage.setItem("nutridoc_theme", "dark");\
        if (iconSpan) iconSpan.textContent = "☀️";\
      }\
      btn.style.transform = "scale(0.95)";\
      setTimeout(() => { if(btn) btn.style.transform = "scale(1)"; }, 150);\
    };\
  }\
})();\
</script>' "$file"
    
    echo "  ✓ $file corrigé"
done

echo ""
echo "✅ Tous les fichiers ont été mis à jour !"
echo "   Mode clair : 🌙 (lune) pour passer en sombre"
echo "   Mode sombre : ☀️ (soleil) pour passer en clair"
