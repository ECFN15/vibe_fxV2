import { SeoLandingPage } from "../components/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "../seo-pages";

const page = getSeoPage("/editeur-image-instagram");

export const metadata = buildSeoMetadata(page);

export default function EditeurImageInstagramPage() {
  return <SeoLandingPage page={page} />;
}
