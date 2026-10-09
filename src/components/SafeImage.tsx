import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

function normalizeImagePath(src?: string | null): string {
  if (!src) return '';
  if (src.startsWith('data:image/')) return src;
  if (src.includes('hero_perfumery_banner')) return '/images/hero_perfumery_banner.jpg';
  if (src.includes('benefit_skincare_kit')) return '/images/benefit_skincare_kit.jpg';
  if (src.includes('benefit_fragrance_voucher')) return '/images/benefit_fragrance_voucher.jpg';
  if (
    src.includes('news_dermocosmetics_launch') ||
    src.includes('news_dermocosmetics_event')
  ) {
    return '/images/news_dermocosmetics_launch.jpg';
  }
  return src;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel,
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = normalizeImagePath(src);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!resolvedSrc || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-emerald-50 p-4 text-center ${className}`}
      >
        <Sparkles className="w-6 h-6 text-emerald-200 mb-1.5 opacity-80" />
        <span className="text-xs font-medium tracking-tight line-clamp-2 max-w-[180px]">
          {fallbackLabel || alt || 'Farmacia y Perfumería Mondino'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
