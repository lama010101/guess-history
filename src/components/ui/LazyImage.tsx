import React, { useState, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

/**
 * LazyImage – displays a skeleton placeholder while the real image loads.
 * 
 * Props extend the native <img> element props. Additional props:
 * - placeholderSrc: optional low-resolution or blurred image to show before the full image loads.
 * - blur: if true, applies a blur filter to the placeholderSrc until the real image finishes loading.
 */
export interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Low-resolution image or base64 data URI (optional). */
  placeholderSrc?: string;
  /** If true, blur the placeholder image. */
  blur?: boolean;
  /** Additional class applied to the skeleton placeholder. */
  skeletonClassName?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholderSrc,
  blur = true,
  skeletonClassName,
  ...imgProps
}) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // Choose what to render if image fails – keep skeleton.
  const handleError = () => {
    setErrored(true);
  };

  return (
    <div className={cn('relative w-full h-full', imgProps.style)}>
      {/* Skeleton placeholder */}
      {!loaded && (
        <Skeleton
          className={cn('absolute inset-0 w-full h-full', skeletonClassName)}
        />
      )}

      {/* Optional placeholder image (blurred) */}
      {placeholderSrc && !loaded && !errored && (
        <img
          src={placeholderSrc}
          aria-hidden
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            blur ? 'filter blur-md scale-110' : '',
          )}
        />
      )}

      {/* Actual image */}
      {!errored && (
        <img
          {...imgProps}
          src={src}
          alt={alt}
          loading={imgProps.loading ?? 'lazy'}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            className,
          )}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default LazyImage;
