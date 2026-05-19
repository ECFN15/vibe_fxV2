import { SeoLandingPage } from "../../SeoLandingPage";
import { createSeoMetadata, getSeoPage } from "../../seo-pages";

const page = getSeoPage("ressources/meta-oauth-publication-instagram-facebook");

export const metadata = createSeoMetadata(page);

export default function MetaOAuthPublicationInstagramFacebookPage() {
  return <SeoLandingPage page={page} />;
}
