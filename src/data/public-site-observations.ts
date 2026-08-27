import { platforms } from "./platforms.ts";
import type { PublicSiteObservation, TrackerObservation } from "./types.ts";

export const TRACKER_RADAR_REVISION = "a1d894db2312f3fdeea06d6c784739b97eb727c8";
export const TRACKER_OBSERVATION_CHECKED_AT = "2026-08-27";
export const TRACKER_OBSERVATION_SOURCE_IDS = ["tracker-radar-data-model-2026", "tracker-radar-collector-2026"] as const;

const AD = ["Ad Motivated Tracking", "Advertising"];
const ANALYTICS = ["Analytics", "Audience Measurement"];
const GA = ["Advertising", "Analytics", "Audience Measurement", "Third-Party Analytics Marketing"];
const GTM = ["Advertising", "Analytics", "Audience Measurement", "Tag Manager"];
const PIXEL = ["Ad Motivated Tracking", "Advertising", "Analytics", "Action Pixels"];
const SESSION_REPLAY = ["Analytics", "Session Replay"];

const tracker = (domain: string, entity: string, categories: string[]): TrackerObservation => ({
  domain,
  entity,
  categories,
  source: "DuckDuckGo Tracker Radar",
});

type ObservedOverride = Pick<PublicSiteObservation, "scanUrl" | "finalUrl" | "trackers" | "thirdPartyDomains">;

const observed = (override: ObservedOverride): PublicSiteObservation => ({
  platformSlug: "",
  status: "observed",
  checkedAt: TRACKER_OBSERVATION_CHECKED_AT,
  consentState: "before-choice",
  methodologyVersion: "1.0",
  note: "Chargement unique de la page publique dans un profil Chrome neuf, sans accepter ni refuser le bandeau. Observation ponctuelle du site vitrine, sans conclusion sur l'application ni sur l'hébergement des factures.",
  ...override,
});

const reviewedObservations: Readonly<Record<string, PublicSiteObservation>> = {
  abby: observed({
    scanUrl: "https://abby.fr/",
    finalUrl: "https://abby.fr/",
    trackers: [],
    thirdPartyDomains: [],
  }),
  b2brouter: observed({
    scanUrl: "https://www.b2brouter.net/fr",
    finalUrl: "https://www.b2brouter.net/fr/",
    trackers: [
      tracker("bing.com", "Microsoft", ["Ad Motivated Tracking", "Advertising", "Action Pixels"]),
      tracker("google-analytics.com", "Google", GA),
      tracker("googlesyndication.com", "Google", AD),
      tracker("googletagmanager.com", "Google", GTM),
      tracker("licdn.com", "Microsoft", ANALYTICS),
      tracker("linkedin.com", "Microsoft", PIXEL),
    ],
    thirdPartyDomains: ["acsbapp.com", "acswapp.com", "bing.com", "google-analytics.com", "googleapis.com", "googlesyndication.com", "googletagmanager.com", "gstatic.com", "iubenda.com", "licdn.com", "linkedin.com", "team.blue", "typeform.com"],
  }),
  dext: observed({
    scanUrl: "https://dext.com/fr/produits/logiciel-facturation",
    finalUrl: "https://dext.com/fr/cabinet/produits/logiciel-facturation",
    trackers: [
      tracker("googletagmanager.com", "Google", GTM),
      tracker("segment.com", "Segment.io", ["Advertising", "Analytics", "Action Pixels"]),
      tracker("trustpilot.com", "Trustpilot", ["Analytics"]),
    ],
    thirdPartyDomains: ["builder.io", "googletagmanager.com", "segment.com", "trustpilot.com"],
  }),
  "fiducial-cloud": observed({
    scanUrl: "https://www.fiducial.fr/",
    finalUrl: "https://www.fiducial.fr/",
    trackers: [
      tracker("commander1.com", "Fjord", ["Analytics", "Audience Measurement", "Action Pixels"]),
      tracker("googlesyndication.com", "Google", AD),
      tracker("googletagmanager.com", "Google", GTM),
    ],
    thirdPartyDomains: ["commander1.com", "googlesyndication.com", "googletagmanager.com"],
  }),
  indy: observed({
    scanUrl: "https://www.indy.fr/",
    finalUrl: "https://www.indy.fr/",
    trackers: [
      tracker("google-analytics.com", "Google", GA),
      tracker("googlesyndication.com", "Google", AD),
      tracker("googletagmanager.com", "Google", GTM),
      tracker("trustpilot.com", "Trustpilot", ["Analytics"]),
      tracker("ubembed.com", "Unbounce", ["Analytics", "Action Pixels"]),
      tracker("visualwebsiteoptimizer.com", "Wingify", SESSION_REPLAY),
    ],
    thirdPartyDomains: ["affilae.com", "axept.io", "calendly.com", "clarity.ms", "customer.io", "customerioforms.com", "google-analytics.com", "googlesyndication.com", "googletagmanager.com", "intercom.io", "jsdelivr.net", "livecall.io", "trustpilot.com", "ubembed.com", "unpkg.com", "visualwebsiteoptimizer.com", "wisepops.com", "wisepops.net"],
  }),
  pennylane: observed({
    scanUrl: "https://www.pennylane.com/fr",
    finalUrl: "https://www.pennylane.com/fr",
    trackers: [
      tracker("abtasty.com", "AB Tasty", SESSION_REPLAY),
      tracker("youtube.com", "Google", ["Ad Motivated Tracking"]),
    ],
    thirdPartyDomains: ["abtasty.com", "ctfassets.net", "googleapis.com", "gstatic.com", "privacy-center.org", "youtube.com"],
  }),
  qonto: observed({
    scanUrl: "https://qonto.com/fr",
    finalUrl: "https://qonto.com/fr",
    trackers: [
      tracker("abtasty.com", "AB Tasty", SESSION_REPLAY),
      tracker("adnxs.com", "Microsoft", AD),
      tracker("adsrvr.org", "The Trade Desk", AD),
      tracker("amazon-adsystem.com", "Amazon.com", AD),
      tracker("bing.com", "Microsoft", ["Ad Motivated Tracking", "Advertising", "Action Pixels"]),
      tracker("company-target.com", "Demandbase", ["Advertising", "Analytics", "Audience Measurement", "Action Pixels"]),
      tracker("contentsquare.net", "ContentSquare", ["Analytics", "Audience Measurement", "Action Pixels", "Session Replay"]),
      tracker("dwin1.com", "Awin", ["Advertising", "Analytics"]),
      tracker("facebook.net", "Facebook", PIXEL),
      tracker("google-analytics.com", "Google", GA),
      tracker("googleadservices.com", "Google", AD),
      tracker("googlesyndication.com", "Google", AD),
      tracker("googletagmanager.com", "Google", GTM),
      tracker("licdn.com", "Microsoft", ANALYTICS),
      tracker("linkedin.com", "Microsoft", PIXEL),
      tracker("outbrain.com", "Outbrain", AD),
      tracker("rlcdn.com", "LiveRamp", ["Advertising", "Analytics"]),
      tracker("sc-static.net", "Snap", PIXEL),
      tracker("sentry-cdn.com", "Functional Software", ["Analytics"]),
      tracker("snapchat.com", "Snap", ["Ad Motivated Tracking", "Action Pixels"]),
      tracker("stackadapt.com", "Collective Roll", ["Advertising", "Analytics", "Audience Measurement", "Action Pixels"]),
      tracker("teads.tv", "Teads", ["Advertising", "Analytics", "Audience Measurement"]),
      tracker("zemanta.com", "Outbrain", AD),
    ],
    thirdPartyDomains: ["abtasty.com", "adnxs.com", "adsrvr.org", "affilae.com", "amazon-adsystem.com", "app-us1.com", "b26net.com", "bing.com", "bing.net", "cloudfront.net", "company-target.com", "contentsquare.net", "demandbase.com", "dwin1.com", "facebook.net", "financeads.net", "google-analytics.com", "googleadservices.com", "googlesyndication.com", "googletagmanager.com", "heap-api.com", "invibes.com", "jsdelivr.net", "jspm.io", "licdn.com", "linkedin.com", "outbrain.com", "paa-reporting-advertising.amazon", "pinimg.com", "pinterest.com", "plyr.io", "podscribe.com", "privacy-center.org", "r66net.com", "r66net.net", "rlcdn.com", "sc-static.net", "sentry-cdn.com", "snapchat.com", "stackadapt.com", "teads.tv", "tiktok.com", "tiktokw.us", "veritonic.com", "veritonicmetrics.com", "videostep.com", "vimeo.com", "zemanta.com"],
  }),
  sellsy: observed({
    scanUrl: "https://go.sellsy.com/",
    finalUrl: "https://go.sellsy.com/",
    trackers: [
      tracker("adform.net", "Adform", ["Advertising", "Audience Measurement"]),
      tracker("adnxs.com", "Microsoft", AD),
      tracker("bing.com", "Microsoft", ["Ad Motivated Tracking", "Advertising", "Action Pixels"]),
      tracker("cloudflare.com", "Cloudflare", ["Analytics"]),
      tracker("doubleclick.net", "Google", AD),
      tracker("facebook.net", "Facebook", PIXEL),
      tracker("google-analytics.com", "Google", GA),
      tracker("google.com", "Google", AD),
      tracker("googlesyndication.com", "Google", AD),
      tracker("googletagmanager.com", "Google", GTM),
      tracker("hs-analytics.net", "HubSpot", ["Analytics", "Audience Measurement", "Action Pixels"]),
      tracker("hs-scripts.com", "HubSpot", ["Advertising", "Analytics", "Audience Measurement"]),
      tracker("hsadspixel.net", "HubSpot", ["Advertising", "Analytics", "Audience Measurement", "Action Pixels"]),
      tracker("hsforms.com", "HubSpot", ["Analytics"]),
      tracker("hubapi.com", "HubSpot", ["Advertising", "Analytics", "Audience Measurement"]),
      tracker("hubspot.com", "HubSpot", ["Advertising", "Analytics"]),
      tracker("licdn.com", "Microsoft", ANALYTICS),
      tracker("linkedin.com", "Microsoft", PIXEL),
      tracker("trustpilot.com", "Trustpilot", ["Analytics"]),
    ],
    thirdPartyDomains: ["adform.net", "adnxs.com", "appvizer.one", "beyable.com", "bing.com", "bing.net", "clarity.ms", "cloudflare.com", "cloudfront.net", "doubleclick.net", "facebook.net", "google-analytics.com", "google.com", "googlesyndication.com", "googletagmanager.com", "hs-analytics.net", "hs-banner.com", "hs-scripts.com", "hs-sites-eu1.com", "hsadspixel.net", "hsappstatic.net", "hsforms.com", "hsforms.net", "hubapi.com", "hubspot.com", "hubspotusercontent-eu1.net", "intercom.io", "jsdelivr.net", "lemlist.com", "licdn.com", "linkedin.com", "privacy-center.org", "reviewflowz.com", "sellsyapp.com", "trustpilot.com", "vimeo.com", "website-files.com", "wisepops.com", "wisepops.net", "zebestof.com"],
  }),
  shine: observed({
    scanUrl: "https://www.shine.fr/",
    finalUrl: "https://www.shine.fr/",
    trackers: [],
    thirdPartyDomains: ["prismic.io", "privacy-center.org"],
  }),
  superpdp: observed({
    scanUrl: "https://www.superpdp.tech/",
    finalUrl: "https://www.superpdp.tech/",
    trackers: [],
    thirdPartyDomains: [],
  }),
  tiime: observed({
    scanUrl: "https://www.tiime.fr/",
    finalUrl: "https://www.tiime.fr/",
    trackers: [
      tracker("bing.com", "Microsoft", ["Ad Motivated Tracking", "Advertising", "Action Pixels"]),
      tracker("facebook.net", "Facebook", PIXEL),
      tracker("googlesyndication.com", "Google", AD),
      tracker("googletagmanager.com", "Google", GTM),
      tracker("hs-analytics.net", "HubSpot", ["Analytics", "Audience Measurement", "Action Pixels"]),
      tracker("hsadspixel.net", "HubSpot", ["Advertising", "Analytics", "Audience Measurement", "Action Pixels"]),
      tracker("hsforms.com", "HubSpot", ["Analytics"]),
      tracker("hubapi.com", "HubSpot", ["Advertising", "Analytics", "Audience Measurement"]),
      tracker("hubspot.com", "HubSpot", ["Advertising", "Analytics"]),
    ],
    thirdPartyDomains: ["axept.io", "bing.com", "bing.net", "clarity.ms", "edi5on.com", "facebook.net", "googleapis.com", "googlesyndication.com", "googletagmanager.com", "gstatic.com", "hs-analytics.net", "hs-banner.com", "hs-sites-eu1.com", "hsadspixel.net", "hscollectedforms.net", "hsforms.com", "hsforms.net", "hubapi.com", "hubspot.com", "hubspotusercontent-eu1.net", "intercom.io", "jsdelivr.net", "usemessages.com"],
  }),
};

export const publicSiteObservations: PublicSiteObservation[] = platforms.map((platform) => {
  const reviewed = reviewedObservations[platform.slug];
  if (reviewed) return { ...reviewed, platformSlug: platform.slug };
  return {
    platformSlug: platform.slug,
    status: "not_scanned",
    scanUrl: null,
    finalUrl: null,
    checkedAt: null,
    consentState: "before-choice",
    methodologyVersion: "1.0",
    trackers: [],
    thirdPartyDomains: [],
    note: "Aucune observation technique relue n'est encore publiée pour ce site.",
  };
});

export const publicSiteObservationBySlug = new Map(publicSiteObservations.map((observation) => [observation.platformSlug, observation]));

export function publicSiteObservationForPlatform(slug: string): PublicSiteObservation {
  const observation = publicSiteObservationBySlug.get(slug);
  if (!observation) throw new Error(`Observation de site absente : ${slug}`);
  return observation;
}
