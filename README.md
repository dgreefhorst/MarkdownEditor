# Markdown Editor (macOS)

WYSIWYG Markdown-editor als Mac-app (Electron). Bestanden worden direct op je Mac gewijzigd via Openen / Opslaan (Cmd+O / Cmd+S).

## Zelf bouwen (aanbevolen, geeft een .dmg)
Vereist Node.js 20+ op je Mac.

    npm install
    npm run dist

Resultaat in `dist/`: een `.dmg` en een `.zip` met `Markdown Editor.app` (voor de architectuur van je Mac).
De app wordt automatisch ad-hoc ondertekend, zodat hij op Apple Silicon start zonder Apple-account.
Alleen testen zonder bouwen: `npm start`.

## Kant-en-klare app (zip)
Deze apps zijn op Linux gebouwd en nog niet ondertekend. Pak de zip uit, en voer eenmalig uit in Terminal:

    xattr -cr "Markdown Editor.app"
    codesign --force --deep --sign - "Markdown Editor.app"

Sleep daarna de app naar Programma's.

## Functies
- Openen, Opslaan, Opslaan als, Nieuw via menu en sneltoetsen
- `.md`-bestanden openen via Finder (Open met…) of door ze op het venster te slepen
- Auto-opslaan naar het geopende bestand (optie bovenin)
- Waarschuwing bij sluiten met niet-opgeslagen wijzigingen; stipje in de titelbalk
- Werkt volledig offline (marked en turndown zijn meegeleverd)
