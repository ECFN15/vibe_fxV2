// ============================================================
// 🚀 ENHANCE.MJS - AUTOMATIC KEYWORD INJECTOR
// ============================================================
// ROLE : Ce script permet d'injecter rapidement et massivement de
// nouveaux mots-clés dans "config.mjs" sans avoir à fouiller dans 
// ses 1000 lignes de code. C'est plus sûr et beaucoup plus rapide.
//
// UTILISATION :
// 1. Ajoutez les nouveaux mots que vous souhaitez classifier dans 
//    l'objet `additions` ci-dessous, en face de la catégorie voulue.
// 2. Ouvrez un terminal et tapez : node enhance.mjs
// 3. Le script lira config.mjs, trouvera les bonnes catégories, 
//    et insérera les mots proprement.
// ============================================================

import fs from 'fs';

// 👇 1. AJOUTEZ VOS NOUVEAUX MOTS-CLÉS ICI 👇
const additions = {
    // Exemples :
    // portraits: ['nouveau mot portrait 1', 'nouveau mot portrait 2'],
    // cars: ['nouvelle marque de voiture', 'jante alu'],

};

// ============================================================
// ⚙️ LOGIQUE D'INJECTION (Ne pas modifier)
// ============================================================
if (Object.keys(additions).length === 0) {
    console.log("Aucun mot-clé à ajouter. Remplissez l'objet 'additions' d'abord !");
    process.exit(0);
}

let content = fs.readFileSync('config.mjs', 'utf8');
let modifiedUrls = 0;

for (const [theme, newKeywords] of Object.entries(additions)) {
    if (!newKeywords || newKeywords.length === 0) continue;

    const regex = new RegExp(`(${theme}:\\s*\\{[\\s\\S]*?keywords:\\s*\\[)([\\s\\S]*?)(\\])`, 'i');

    // Check if theme exists in config.mjs
    if (!regex.test(content)) {
        console.log(`⚠️ Catégorie '${theme}' non trouvée dans config.mjs. Ignoré.`);
        continue;
    }

    content = content.replace(regex, (match, p1, p2, p3) => {
        const newStr = '\n                // ➕ AI/Manual Injection\n                ' + newKeywords.map(k => `'${k}'`).join(', ') + ',\n            ';
        return p1 + p2 + newStr + p3;
    });
    modifiedUrls++;
    console.log(`✅ ${newKeywords.length} mots ajoutés à '${theme}'`);
}

if (modifiedUrls > 0) {
    fs.writeFileSync('config.mjs', content);
    console.log(`\n🎉 Succès ! config.mjs a été mis à jour de façon sécurisée.`);
}
