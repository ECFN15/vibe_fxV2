import { SeoLandingPage } from "../components/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "../seo-pages";

const page = getSeoPage("/outil-publication-reseaux-sociaux");

export const metadata = buildSeoMetadata(page);

export default function OutilPublicationReseauxSociauxPage() {
  return <SeoLandingPage page={page} />;
}
