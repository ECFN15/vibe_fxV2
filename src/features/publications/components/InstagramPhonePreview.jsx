import { useState } from "react";
import * as Icons from "lucide-react";

export default function InstagramPhonePreview({ imageUrl, socialImages, format, caption, title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = socialImages?.length ? socialImages.map((item) => item.url || item) : imageUrl ? [imageUrl] : [];
  const activeSlide = slides[Math.min(activeIndex, Math.max(slides.length - 1, 0))] || imageUrl;
  const isStoryLike = format.publishKind === "story" || format.publishKind === "reel";

  return (
    <div className="phone-frame pub-phone-inline">
      <div className="phone-speaker" />
      <div className="phone-screen">
        <div className="phone-status"><span>9:41</span><span><Icons.Wifi size={13} /><Icons.BatteryMedium size={15} /></span></div>
        {isStoryLike ? (
          <div className="story-preview">
            {activeSlide ? <img src={activeSlide} alt="" /> : <div className="phone-empty-media" />}
            <div className="story-bars"><i /></div>
            <div className="story-head"><span>vibefx.studio</span><small>2h</small><Icons.MoreHorizontal size={18} /></div>
            <div className="story-bottom"><span>Envoyer un message</span><Icons.Heart size={24} /><Icons.Send size={24} /></div>
          </div>
        ) : (
          <div className="feed-preview">
            <header><Icons.ChevronLeft size={24} /><strong>Publications</strong><Icons.MoreHorizontal size={18} /></header>
            <div className="post-head">
              <span className="avatar">VF</span>
              <div><strong>vibefx.studio</strong><small>Vibe_fx Studio - Original</small></div>
            </div>
            <div className="post-media" style={{ aspectRatio: "4 / 5" }}>
              {activeSlide ? <img src={activeSlide} alt="" /> : <div className="phone-empty-media" />}
              {slides.length > 1 ? (
                <div className="post-nav">
                  {slides.map((_, index) => (
                    <button key={index} type="button" className={activeIndex === index ? "active" : ""} onClick={() => setActiveIndex(index)} />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="post-actions"><Icons.Heart size={24} /><Icons.MessageCircle size={24} /><Icons.Send size={24} /><Icons.Bookmark size={24} /></div>
            <p><strong>vibefx.studio</strong> {caption || title || "Nouvelle publication."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
