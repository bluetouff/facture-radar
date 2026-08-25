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
    headline: "Commencez par B2Brouter, puis testez le dernier mètre.",
    explanation: "B2Brouter est la piste publique la plus complète pour ce besoin : PA directe, portail web, import PDF ou XML et émission électronique. Un point décisif reste à contrôler avant de s'engager : la conservation du XML EN16931 d'un Factur-X créé par un autre logiciel, sans ressaisie.",
    options: directRoutingOptions.map((option) => ({ ...option, price: option.priceByVolume[volume] })),
    vendorQuestion: "Votre portail accepte-t-il l'import manuel d'un PDF/A-3 Factur-X profil EN16931 généré par un logiciel tiers, puis son émission réglementaire sans Solution Compatible, sans OCR et sans ressaisie des lignes ? Si oui, quel écran utiliser et quel tarif s'applique ?",
  };
}
