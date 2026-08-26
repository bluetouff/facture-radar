import { directRoutingOptions, type DirectRoutingOption, type DirectRoutingVolume } from "../data/direct-routing-options.ts";

export type { DirectRoutingVolume } from "../data/direct-routing-options.ts";

export interface DirectRoutingAnswer {
  question: string;
  headline: string;
  explanation: string;
  options: Array<DirectRoutingOption & { price: string }>;
  vendorQuestion: string;
}

export function buildDirectFacturXAnswer(volume: DirectRoutingVolume = "unknown"): DirectRoutingAnswer {
  return {
    question: "J'ai déjà un PDF/A-3 Factur-X profil EN16931. Quelle PA peut l'envoyer directement, sans passer par une Solution Compatible ?",
    headline: "B2Brouter est la piste la mieux documentée pour ce besoin.",
    explanation: "Ses pages publiques confirment un accès direct, l'import de PDF ou XML et l'envoi électronique. Elles ne précisent pas si le XML EN16931 d'un Factur-X créé ailleurs est conservé sans ressaisie. Faites confirmer ce point avant de vous engager.",
    options: directRoutingOptions.map((option) => ({ ...option, price: option.priceByVolume[volume] })),
    vendorQuestion: "Votre portail accepte-t-il l'import manuel d'un PDF/A-3 Factur-X profil EN16931 généré par un logiciel tiers, puis son émission réglementaire sans Solution Compatible, sans OCR et sans ressaisie des lignes ? Si oui, quel écran utiliser et quel tarif s'applique ?",
  };
}
