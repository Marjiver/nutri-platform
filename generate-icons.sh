#!/bin/bash
# generate-icons.sh - Génère les icônes PWA à partir d'une image source

SOURCE_IMAGE="logo-source.png"
OUTPUT_DIR="assets/icons"

# Créer le dossier si nécessaire
mkdir -p $OUTPUT_DIR

# Tailles des icônes
SIZES=(72 96 128 144 152 192 256 384 512)

for size in "${SIZES[@]}"; do
  echo "Génération de icon-${size}x${size}.png..."
  convert "$SOURCE_IMAGE" -resize ${size}x${size} "$OUTPUT_DIR/icon-${size}x${size}.png"
done

# Icônes pour les raccourcis
convert "$SOURCE_IMAGE" -resize 96x96 "$OUTPUT_DIR/shortcut-bilan.png"
convert "$SOURCE_IMAGE" -resize 96x96 "$OUTPUT_DIR/shortcut-dashboard.png"
convert "$SOURCE_IMAGE" -resize 96x96 "$OUTPUT_DIR/shortcut-diet.png"

# Badge pour notifications
convert "$SOURCE_IMAGE" -resize 72x72 "$OUTPUT_DIR/badge-72x72.png"

echo "✅ Icônes générées avec succès dans $OUTPUT_DIR/"