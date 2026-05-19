import { SeoLandingPage } from "../SeoLandingPage";
import { createSeoMetadata, getSeoPage } from "../seo-pages";

const page = getSeoPage("publier-instagram-facebook");

export const metadata = createSeoMetadata(page);

export default function PublierInstagramFacebookPage() {
  return <SeoLandingPage page={page} />;
}
