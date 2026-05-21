import { MAX_CAPTION_LENGTH, MAX_HASHTAGS } from "../helpers/publicationHelpers";
import InstagramPhonePreview from "./InstagramPhonePreview";

export default function PublicationPreview({ imageUrl, socialImages, format, caption, title, checker, exportSize }) {
  return (
    <aside className="pub-final-preview" aria-label="Preview publication">
      <header className="pub-module-head">
        <span>Preview</span>
        <strong>{format.label}</strong>
      </header>
      <div className="pub-preview-frame">
        <i aria-hidden="true" />
        <InstagramPhonePreview imageUrl={imageUrl} socialImages={socialImages} format={format} caption={caption} title={title} />
      </div>
      <section className="pub-checker-panel" aria-label="Verification publication">
        <div className={`checker-score ${checker.score >= 80 ? "good" : checker.score >= 55 ? "warn" : "bad"}`}>
          <strong>{checker.score}</strong>
          <span>Score preview</span>
        </div>
        <div className="checker-meta">
          <span>{caption.length}/{MAX_CAPTION_LENGTH} caracteres</span>
          <span>{checker.hashtags}/{MAX_HASHTAGS} hashtags</span>
          <span>{exportSize ? `${(exportSize / 1024 / 1024).toFixed(2)} MB` : "Image distante"}</span>
        </div>
        {[...checker.issues, ...checker.warnings].length ? (
          <ul className="checker-list">
            {checker.issues.map((item) => <li className="issue" key={item}>{item}</li>)}
            {checker.warnings.map((item) => <li key={item}>{item}</li>)}
          </ul>
        ) : (
          <p className="checker-ok">Le visuel est propre pour la publication.</p>
        )}
      </section>
    </aside>
  );
}
