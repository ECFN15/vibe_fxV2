import { SeoLandingPage } from "../../SeoLandingPage";
import { createSeoMetadata, getSeoPage } from "../../seo-pages";

const page = getSeoPage("ressources/formats-instagram");

export const metadata = createSeoMetadata(page);

export default function FormatsInstagramPage() {
  return <SeoLandingPage page={page} />;
}
