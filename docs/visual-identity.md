# Identité visuelle de PA Check

La direction associe un fond ivoire, une encre presque noire et un accent vermillon. Inter structure les outils ; Newsreader en italique donne une voix aux accroches. Le papier plié relie l'identité à la facture, sans représenter une certification d'une plateforme.

Les boutons et liens utilisent un vermillon plus sombre (`#bc381c`) pour conserver le contraste du texte. Les couleurs de preuve restent distinctes : documenté, déclaré, officiel et non documenté ne sont pas des catégories esthétiques interchangeables.

Le sigle et le favicon sont des vecteurs natifs. L'illustration originale est conservée dans `src/assets/pa-check-paper-v1.png` ; Astro produit les variantes WebP adaptées à l'écran. L'image de partage est `public/og/pa-check-facturation-electronique-v3.png` (1200 × 630).

## Illustration

Mode utilisé : outil intégré imagegen, sans ajout de dépendance ni appel à une API dans le site.

Prompt final :

> Use case: stylized-concept. Asset type: original editorial hero artwork for PA Check, an independent French electronic invoicing research and comparison service. Create a highly art-directed, tactile studio still life, landscape 4:3, suitable for an outstanding European design studio website. Subject: a single sculptural large verification checkmark made from one expertly folded broad ribbon of vivid vermilion-orange paper, physically standing with its short arm lower-left and long arm rising upper-right. Its paper edges and creases are beautifully real and subtle. Behind and beneath it, a restrained fan of thick warm-white paper sheets with very fine embossed horizontal lines, like abstract invoices with NO readable text. Composition: one confident sculptural silhouette in the center, generous quiet margins, an ivory seamless studio backdrop and floor, no frame. Soft directional daylight from upper left, long delicate shadows, premium product photography, nuanced paper grain, architectural sophistication. Palette: warm ivory #f4f1e9, vermilion #ef4827, faint charcoal shadows. The art will occupy the right half of a website hero; it should be visually bold, not busy. No letters, words, numbers, logos, watermarks, icons, UI mockups, screens, graphs, coins or unrelated objects. No chrome, glass, plastic, glowing neon or generic floating SaaS cards.

## Interactions

- Annuaire : critères sourcés sur les cartes, retour aux filtres sans perdre le fragment de recherche, sélection visible.
- Comparateur : accès direct aux critères affichés, barre d'actions persistante, différences et sources conservées.
- Fiches : rubrique courante indiquée dans le sommaire pendant la lecture.
- Accueil : recherche progressive, lien vers les questions sans JavaScript, mouvement d'entrée désactivé selon la préférence de réduction des animations.
