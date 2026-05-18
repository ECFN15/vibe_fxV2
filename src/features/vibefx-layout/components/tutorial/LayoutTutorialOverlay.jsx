import React, { useEffect } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  CircleHelp,
  Layers,
  MousePointer2,
  Palette,
  PlayCircle,
  Send,
  Sparkles,
  Type,
  Upload,
  X,
} from 'lucide-react';

const routeCards = [
  {
    title: 'Format',
    text: 'Choisissez le canal en premier. Portrait pour Instagram, Story/Reel pour le plein ecran, Paysage pour une banniere, Pano x2/x3 pour un carrousel decoupe automatiquement.',
  },
  {
    title: 'Modele',
    text: 'Standard et Cinema travaillent une image forte. Pic-in-Pic, Double, Pellicule, Mosaique et Grille servent quand plusieurs photos racontent la meme scene.',
  },
  {
    title: 'Nombre images',
    text: 'Le modele indique ses zones. Si vous importez moins de photos, certaines zones reutilisent la matiere disponible. Si vous en ajoutez plus, les miniatures restent en bas.',
  },
  {
    title: 'Fond',
    text: 'Le flou arriere-plan reprend l image principale. Desactivez-le pour piloter une couleur pure, puis ajoutez du grain ou un flou lisse si le visuel manque de profondeur.',
  },
];

const workflowSteps = [
  {
    icon: <Upload size={18} />,
    title: '1. Importer la matiere',
    body: 'Cliquez sur [ PC LOCAL ], choisissez une ou plusieurs images, puis laissez le studio charger les sources. Vous pouvez ajouter d autres images ensuite depuis les miniatures du bas.',
    tip: 'Astuce : commencez avec vos meilleures photos, puis completez seulement si le modele choisi reclame plusieurs zones.',
  },
  {
    icon: <Layers size={18} />,
    title: '2. Choisir format + modele',
    body: 'Le format fixe la taille finale. Le modele fixe la composition. Pano x2/x3 garde des lignes rouges de coupe pour visualiser les slides du carrousel.',
    tip: 'Pour un post rapide : Portrait + Standard. Pour avant/apres : Double. Pour ambiance atelier : Pellicule ou Mosaique.',
  },
  {
    icon: <MousePointer2 size={18} />,
    title: '3. Ajuster les images',
    body: 'Cliquez une zone image sur le canvas. Le panneau Zone selectionnee apparait avec Zoom, Position X/Y, Bordure et Flou. Fermez la zone pour revenir aux autres reglages.',
    tip: 'Les ajustements sont par zone, pas globaux : parfait pour recadrer une photo sans toucher aux autres.',
  },
  {
    icon: <Type size={18} />,
    title: '4. Poser les textes',
    body: 'Dans Textes & Boutons, creez un texte ou selectionnez un texte existant sur le canvas. Modifiez contenu, police, gras, italique, taille, tracking, rotation, opacite et style de fond.',
    tip: 'Les styles Bloc, Bulle, Scotch, Tech Corners et Contour revelent des options conditionnelles comme radius, coins ou epaisseur.',
  },
  {
    icon: <Palette size={18} />,
    title: '5. Regler geometrie et fond',
    body: 'Geometrie ajuste la marge externe, l espace entre images et l arrondi. Polaroid reste volontairement fixe. Fond Global controle flou, couleur, grain, guides pano et Flou Lisse Pro.',
    tip: 'Si le visuel semble plat, activez le flou arriere-plan avec un grain leger autour de 10-20%.',
  },
  {
    icon: <Send size={18} />,
    title: '6. Exporter ou importer',
    body: 'PNG telecharge le rendu. Importer envoie le visuel dans le studio publications. En Pano x2/x3, le rendu complet est decoupe en slides prets pour Instagram.',
    tip: 'Le bouton Reinitialiser vide les images pour repartir proprement, sans quitter la page.',
  },
];

const featureGroups = [
  {
    title: 'Textes avances',
    items: ['Inverser texte/fond', 'Glow ou ombre', 'Opacite du bloc', 'Rotation libre', 'Deplacement direct sur canvas'],
  },
  {
    title: 'Images avancees',
    items: ['Zoom par zone', 'Position X/Y', 'Bordure locale', 'Flou local', 'Suppression via miniature'],
  },
  {
    title: 'Choix dynamiques',
    items: ['Pic-in-Pic affiche Style Overlay', 'Polaroid verrouille la geometrie', 'Multi-zone affiche Gap', 'Pano affiche les guides'],
  },
];

export default function LayoutTutorialOverlay({ open, onClose, onStartDemo }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="vibefx-tutorial-layer" role="dialog" aria-modal="true" aria-labelledby="vibefx-tutorial-title">
      <button type="button" className="vibefx-tutorial-backdrop" onClick={onClose} aria-label="Fermer le tutoriel" />

      <article className="vibefx-tutorial-panel">
        <header className="vibefx-tutorial-hero">
          <div className="vibefx-tutorial-hero-copy">
            <span className="vibefx-tutorial-kicker"><CircleHelp size={14} /> Tutoriel complet</span>
            <h2 id="vibefx-tutorial-title">Creer un post Vibe_fx de A a Z</h2>
            <p>
              Suivez ce deroule une fois, puis gardez-le comme carte mentale : chaque bloc explique quoi faire,
              ce que le choix declenche, et ou regarder quand une option semble cachee.
            </p>
          </div>
          <button type="button" className="vibefx-tutorial-close" onClick={onClose} aria-label="Fermer le tutoriel">
            <X size={18} />
          </button>
        </header>

        <section className="vibefx-tutorial-start">
          <div className="vibefx-tutorial-bubble primary">
            <BadgeCheck size={18} />
            <div>
              <strong>Objectif simple</strong>
              <span>Une image claire, un format social juste, un texte lisible, puis Importer vers Publications.</span>
            </div>
          </div>
          <div className="vibefx-tutorial-bubble">
            <Sparkles size={18} />
            <div>
              <strong>Regle pro</strong>
              <span>Travaillez dans cet ordre : images, structure, texte, finitions, export. Le studio devient beaucoup plus calme.</span>
            </div>
          </div>
        </section>

        <section className="vibefx-tutorial-section">
          <div className="vibefx-tutorial-section-head">
            <span>Parcours guide</span>
            <p>Tout le tutoriel est ouvert ici, sans etape bloquante.</p>
          </div>
          <div className="vibefx-tutorial-timeline">
            {workflowSteps.map((step, index) => (
              <div className="vibefx-tutorial-step" key={step.title} style={{ '--vf-delay': `${index * 70}ms` }}>
                <div className="vibefx-tutorial-step-icon">{step.icon}</div>
                <div className="vibefx-tutorial-step-card">
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <small>{step.tip}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="vibefx-tutorial-section">
          <div className="vibefx-tutorial-section-head">
            <span>Branches de decision</span>
            <p>Ce sont les chemins qui changent vraiment l interface.</p>
          </div>
          <div className="vibefx-tutorial-routes">
            {routeCards.map((card) => (
              <div className="vibefx-tutorial-route" key={card.title}>
                <div className="vibefx-tutorial-route-title">
                  <ChevronRight size={15} />
                  <strong>{card.title}</strong>
                </div>
                <p>{card.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="vibefx-tutorial-section">
          <div className="vibefx-tutorial-section-head">
            <span>Options moins evidentes</span>
            <p>Les features importantes qui ne sautent pas aux yeux au premier usage.</p>
          </div>
          <div className="vibefx-tutorial-features">
            {featureGroups.map((group) => (
              <div className="vibefx-tutorial-feature" key={group.title}>
                <h3>{group.title}</h3>
                {group.items.map((item) => (
                  <div className="vibefx-tutorial-feature-row" key={item}>
                    <span />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <footer className="vibefx-tutorial-footer">
          <div>
            <strong>Pret a creer</strong>
            <span>Fermez ce guide, importez vos images, puis suivez le parcours dans l ordre.</span>
          </div>
          <div className="vibefx-tutorial-footer-actions">
            <button type="button" className="vibefx-tutorial-secondary" onClick={onClose}>
              Fermer
            </button>
            <button type="button" className="vibefx-tutorial-secondary" onClick={onStartDemo}>
              Demo live <PlayCircle size={15} />
            </button>
            <button type="button" className="vibefx-tutorial-primary" onClick={onClose}>
              Commencer a creer <ArrowRight size={15} />
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}
