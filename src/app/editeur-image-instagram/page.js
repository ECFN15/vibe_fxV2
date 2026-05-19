import { SeoLandingPage } from "../SeoLandingPage";
import { createSeoMetadata, getSeoPage } from "../seo-pages";

const page = getSeoPage("editeur-image-instagram");

export const metadata = createSeoMetadata(page);

export default function EditeurImageInstagramPage() {
  return <SeoLandingPage page={page} />;
}
