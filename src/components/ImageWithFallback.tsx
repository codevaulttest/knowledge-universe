import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { ImageOff } from 'lucide-react';

interface ImageWithFallbackProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** 加载失败或 src 为空时展示的内容，未传时使用通用的裂图图标 */
  fallback?: ReactNode;
}

/** 图片加载失败兜底：默认显示 ImageOff 图标，也可传入 fallback（如 BoringAvatar）自定义 */
export function ImageWithFallback({ src, alt, fallback, onError, ...rest }: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return fallback !== undefined ? <>{fallback}</> : (
      <div className="image-fallback">
        <ImageOff size={16} strokeWidth={1.8} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={e => {
        setFailed(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
}
