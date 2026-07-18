import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowDown, FiArrowUp, FiImage, FiStar, FiTrash2, FiUpload } from "react-icons/fi";
import { Badge } from "../../components/ui/badge.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Card, CardHeader } from "../../components/ui/card.tsx";
import { EmptyState } from "../../components/ui/empty-state.tsx";
import { ErrorState } from "../../components/ui/error-state.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Spinner } from "../../components/ui/spinner.tsx";
import { ApiError } from "../../lib/api-error.ts";
import {
  listImages,
  productKeys,
  removeImage,
  reorderImages,
  setPrimaryImage,
  updateImage,
  uploadImage,
} from "./api.ts";

/**
 * Read a file as a `data:` URL, which is exactly the shape the backend accepts as a
 * base64 payload (`data:image/...;base64,...`), so no manual base64 stripping is needed.
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the selected file"));
    reader.readAsDataURL(file);
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Product image gallery for the detail page.
 *
 * The upload endpoint is JSON rather than multipart, so the selected file is encoded
 * client-side. Mutations invalidate both the images query and the parent product detail
 * so a freshly uploaded primary image shows up everywhere at once.
 */
export function ProductImages({ productId, canManage }: { productId: string; canManage: boolean }) {
  const client = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [altText, setAltText] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Signed image URLs expire, and the object can also be unreachable if storage is not
  // configured. Track the ones that actually failed to load so the grid shows the same
  // "Image unavailable" placeholder instead of a broken-image glyph.
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(new Set());

  const imagesQuery = useQuery({
    queryKey: productKeys.images(productId),
    queryFn: () => listImages(productId),
  });

  const invalidate = () => {
    client.invalidateQueries({ queryKey: productKeys.images(productId) });
    client.invalidateQueries({ queryKey: productKeys.detail(productId) });
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) =>
      uploadImage(productId, {
        data: await readFileAsDataUrl(file),
        altText: altText.trim() || null,
      }),
    onSuccess: () => {
      setAltText("");
      setUploadError(null);
      if (fileInput.current) fileInput.current.value = "";
      invalidate();
    },
    onError: (error) => setUploadError(errorMessage(error, "The image could not be uploaded.")),
  });

  const primaryMutation = useMutation({
    mutationFn: (imageId: string) => setPrimaryImage(productId, imageId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => removeImage(productId, imageId),
    onSuccess: invalidate,
  });

  const altMutation = useMutation({
    mutationFn: (input: { imageId: string; altText: string | null }) =>
      updateImage(productId, input.imageId, input.altText),
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: (imageIds: string[]) => reorderImages(productId, imageIds),
    onSuccess: invalidate,
  });

  const images = imagesQuery.data ?? [];
  const actionError =
    primaryMutation.error ?? deleteMutation.error ?? altMutation.error ?? reorderMutation.error;

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;

    if (target < 0 || target >= images.length) return;

    const ids = images.map((image) => image.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderMutation.mutate(ids);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) uploadMutation.mutate(file);
  };
return (
    <Card>
      <CardHeader
        title="Product images"
        subtitle="Upload, caption, order, and choose the primary image"
      />

      {imagesQuery.isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      ) : imagesQuery.isError ? (
        <ErrorState
          title="Could not load images"
          message={errorMessage(imagesQuery.error, "Please try again.")}
          onRetry={() => imagesQuery.refetch()}
        />
      ) : images.length === 0 ? (
        <EmptyState
          icon={<FiImage className="h-8 w-8 text-slate-400" />}
          title="No images yet"
          description={
            canManage ? "Upload the first image to build the gallery." : "This product has no images."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <div key={image.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="relative flex h-40 items-center justify-center bg-slate-100">
                {image.url && !failedImages.has(image.id) ? (
                  <img
                    src={image.url}
                    alt={image.altText ?? ""}
                    loading="lazy"
                    className="h-full w-full object-contain"
                    onError={() =>
                      setFailedImages((previous) => new Set(previous).add(image.id))
                    }
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <FiImage className="h-7 w-7" />
                    <span className="text-[11px]">Image unavailable</span>
                  </div>
                )}
                {image.isPrimary && (
                  <Badge variant="info" size="sm" className="absolute left-2 top-2">
                    <FiStar className="mr-1 h-3 w-3" />
                    Primary
                  </Badge>
                )}
              </div>

              <div className="space-y-2 p-3">
                {canManage ? (
                  <>
                    <input
                      aria-label={`Alt text for image ${index + 1}`}
                      className="block w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Alt text"
                      defaultValue={image.altText ?? ""}
                      onBlur={(event) => {
                        const next = event.target.value.trim() || null;

                        if (next !== image.altText) altMutation.mutate({ imageId: image.id, altText: next });
                      }}
                    />
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label="Move image up"
                      >
                        <FiArrowUp />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={index === images.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label="Move image down"
                      >
                        <FiArrowDown />
                      </Button>
                      {!image.isPrimary && (
                        <Button size="sm" variant="ghost" onClick={() => primaryMutation.mutate(image.id)}>
                          Set primary
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => {
                          if (window.confirm("Remove this image?")) deleteMutation.mutate(image.id);
                        }}
                        aria-label="Delete image"
                      >
                        <FiTrash2 />
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">{image.altText ?? "No alt text"}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              label="Alt text (optional)"
              value={altText}
              maxLength={255}
              placeholder="Describe this image"
              onChange={(event) => setAltText(event.target.value)}
            />
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <Button
              variant="outline"
              leftIcon={<FiUpload className="h-4 w-4" />}
              isLoading={uploadMutation.isPending}
              onClick={() => fileInput.current?.click()}
            >
              Upload image
            </Button>
          </div>
          {uploadError && <p className="mt-2 text-xs font-medium text-red-600">{uploadError}</p>}
          {actionError && (
            <p className="mt-2 text-xs font-medium text-red-600">
              {errorMessage(actionError, "The change could not be saved.")}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}