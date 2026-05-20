import { SeoLandingPage } from "../components/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "../seo-pages";

const page = getSeoPage("/templates");

export const metadata = buildSeoMetadata(page);

export default function TemplatesPage() {
  return <SeoLandingPage page={page} />;
}
