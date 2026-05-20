import { SeoLandingPage } from "../components/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "../seo-pages";

const page = getSeoPage("/publier-instagram-facebook");

export const metadata = buildSeoMetadata(page);

export default function PublierInstagramFacebookPage() {
  return <SeoLandingPage page={page} />;
}
