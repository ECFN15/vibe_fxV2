import { SeoLandingPage } from "../../components/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "../../seo-pages";

const page = getSeoPage("/ressources/meta-oauth-publication-instagram-facebook");

export const metadata = buildSeoMetadata(page);

export default function MetaOAuthPublicationInstagramFacebookPage() {
  return <SeoLandingPage page={page} />;
}
