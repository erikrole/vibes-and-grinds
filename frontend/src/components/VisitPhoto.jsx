import { useState } from 'react';
import { photoVariantUrl } from '../../../shared/photos.mjs';

function Photo({ src, size, alt, onError, ...props }) {
  const [fallback, setFallback] = useState(false);
  const preferred = photoVariantUrl(src, size);
  const optimized = !fallback && preferred !== src;
  return <img {...props} alt={alt} src={optimized ? preferred : src}
    srcSet={optimized && size === 160 ? `${preferred} 160w, ${photoVariantUrl(src, 320)} 320w` : undefined}
    sizes={optimized && size === 160 ? '80px' : undefined} decoding="async"
    onError={(event) => { if (optimized) setFallback(true); else onError?.(event); }} />;
}

export default function VisitPhoto({ src, size = 1600, ...props }) {
  return <Photo key={`${src}:${size}`} src={src} size={size} {...props} />;
}
