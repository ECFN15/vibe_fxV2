import { SeoLandingPage } from "../SeoLandingPage";
import { createSeoMetadata, getSeoPage } from "../seo-pages";

const page = getSeoPage("templates");

export const metadata = createSeoMetadata(page);

export default function TemplatesPage() {
  return <SeoLandingPage page={page} />;
}
