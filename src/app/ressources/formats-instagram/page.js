import { SeoLandingPage } from "../../components/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "../../seo-pages";

const page = getSeoPage("/ressources/formats-instagram");

export const metadata = buildSeoMetadata(page);

export default function FormatsInstagramPage() {
  return <SeoLandingPage page={page} />;
}
