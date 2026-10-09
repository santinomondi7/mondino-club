import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Link2, Check } from 'lucide-react';
import { SafeImage } from './SafeImage.tsx';
import { GENERATED_IMAGES } from '../constants/index.ts';

/**
 * Comprime y redimensiona automáticamente cualquier foto seleccionada desde el celular o PC
 * a un Data URL JPEG optimizado (~40-90 KB) para guardarse directamente en PostgreSQL (image_url)
 * sin requerir cambios ni buckets adicionales en Supabase.
 */
export function compressImageFileToDataUrl(
  file: File,
  maxWidth = 960,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Seleccioná un archivo de imagen válido (JPG, PNG, WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no soportado.'));
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch {
          resolve(String(reader.result));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const PRESET_GALLERY = [
  {
    label: 'Perfumería',
    url: GENERATED_IMAGES.heroPerfumery,
  },
  {
    label: 'Skincare / Dermo',
    url: GENERATED_IMAGES.benefitSkincare,
  },
  {
    label: 'Voucher / Regalo',
    url: GENERATED_IMAGES.benefitFragrance,
  },
  {
    label: 'Evento / Novedad',
    url: GENERATED_IMAGES.newsDermocosmetics,
  },
];

interface ImageUploaderFieldProps {
  label?: string;
  value: string;
  onChange: (newUrl: string) => void;
  helperText?: string;
}

export const ImageUploaderField: React.FC<ImageUploaderFieldProps> = ({
  label = 'Fotografía de la publicación',
  value,
  onChange,
  helperText = 'Subí una foto desde tu celular o computadora, o pegá el enlace de una imagen.',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const optimizedDataUrl = await compressImageFileToDataUrl(file);
      onChange(optimizedDataUrl);
    } catch (err: any) {
      setError(err?.message || 'Error al procesar la imagen.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-slate-800">{label}</label>
        <button
          type="button"
          onClick={() => setShowUrlInput((prev) => !prev)}
          className="text-[11px] font-medium text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Link2 className="w-3 h-3" />
          <span>{showUrlInput ? 'Ocultar enlace URL' : 'Pegar URL de imagen'}</span>
        </button>
      </div>

      {/* Preview + Upload Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="w-full sm:w-32 h-28 sm:h-24 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 relative">
          <SafeImage src={value} alt={label} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>
              {uploading ? 'Optimizando foto...' : 'Subir foto desde mi dispositivo / cámara'}
            </span>
          </button>
          <p className="text-[11px] text-slate-500 leading-snug">{helperText}</p>
        </div>
      </div>

      {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}

      {showUrlInput && (
        <div className="pt-1">
          <input
            type="text"
            placeholder="https://... o ruta de imagen"
            value={value.startsWith('data:image/') ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[38px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-800"
          />
        </div>
      )}

      {/* Quick Presets */}
      <div className="pt-1">
        <span className="text-[11px] text-slate-500 flex items-center gap-1 mb-1.5">
          <ImageIcon className="w-3 h-3 text-slate-400" />
          O elegir imagen predeterminada del catálogo:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {PRESET_GALLERY.map((preset) => {
            const isSelected = value === preset.url;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.url)}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-between gap-1 transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-emerald-800 bg-emerald-50 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{preset.label}</span>
                {isSelected && <Check className="w-3 h-3 text-emerald-800 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
