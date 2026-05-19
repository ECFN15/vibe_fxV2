import { SeoLandingPage } from "../SeoLandingPage";
import { createSeoMetadata, getSeoPage } from "../seo-pages";

const page = getSeoPage("outil-publication-reseaux-sociaux");

export const metadata = createSeoMetadata(page);

export default function OutilPublicationReseauxSociauxPage() {
  return <SeoLandingPage page={page} />;
}
