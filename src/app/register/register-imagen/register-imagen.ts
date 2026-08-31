import { Component, DestroyRef, inject, input, signal, effect } from '@angular/core';
import { Imagen, ImagenService, TipoImagen } from './imagen.service';

export interface ImagenCard {
  localId: number;
  idImagen?: number;
  uuid: string | null;
  idTipoImagenDocumento: number | null;
  thumbnailUrl: string | null;
  uploading: boolean;
  saving: boolean;
  saveSuccess: boolean;
  error: string | null;
}

@Component({
  selector: 'app-register-imagen',
  templateUrl: './register-imagen.html',
  styleUrl: './register-imagen.css',
})
export class RegisterImagen {
  private readonly imagenService = inject(ImagenService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idPersona = input.required<number>();

  readonly tipos = signal<Array<TipoImagen>>([]);
  readonly images = signal<Array<ImagenCard>>([]);
  readonly loadError = signal<string | null>(null);
  readonly tiposError = signal<string | null>(null);
  readonly loading = signal(false);

  private nextLocalId = 0;
  private loadedPersonaId: number | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeAllThumbnails());
    this.loadTipos();

    effect(() => {
      const idPersona = this.idPersona();
      if (idPersona && idPersona !== this.loadedPersonaId) {
        this.loadedPersonaId = idPersona;
        this.loadImages(idPersona);
      }
    });
  }

  onAddFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    const localId = this.addCard();
    this.uploadFile(localId, file);
  }

  onReplaceFile(localId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.uploadFile(localId, file);
  }

  onTypeChange(localId: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const idTipoImagenDocumento = Number(select.value);
    if (!idTipoImagenDocumento) {
      return;
    }

    const card = this.findCard(localId);
    if (!card?.uuid) {
      return;
    }

    this.patchCard(localId, { idTipoImagenDocumento, saveSuccess: false, error: null });
    this.saveCard(localId);
  }

  onDiscardDraft(localId: number): void {
    const card = this.findCard(localId);
    if (!card || card.idImagen !== undefined || card.saving) {
      return;
    }
    if (card.thumbnailUrl) {
      URL.revokeObjectURL(card.thumbnailUrl);
    }
    this.images.update((cards) => cards.filter((item) => item.localId !== localId));
  }

  private loadTipos(): void {
    this.imagenService.listTipos().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos ?? []);
        this.tiposError.set(null);
      },
      error: () => this.tiposError.set('No se pudieron cargar los tipos de imagen.'),
    });
  }

  private loadImages(idPersona: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.imagenService.findByIdPersona(idPersona).subscribe({
      next: (imagenes) => {
        this.revokeAllThumbnails();
        const cards = (imagenes ?? []).map((imagen) => this.toCard(imagen));
        this.images.set(cards);
        this.loading.set(false);
        for (const card of cards) {
          if (card.uuid) {
            this.loadThumbnail(card.localId, card.uuid);
          }
        }
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudieron cargar las imágenes.');
      },
    });
  }

  private addCard(): number {
    const localId = ++this.nextLocalId;
    this.images.update((cards) => [
      ...cards,
      {
        localId,
        uuid: null,
        idTipoImagenDocumento: null,
        thumbnailUrl: null,
        uploading: true,
        saving: false,
        saveSuccess: false,
        error: null,
      },
    ]);
    return localId;
  }

  private toCard(imagen: Imagen): ImagenCard {
    return {
      localId: ++this.nextLocalId,
      idImagen: imagen.idImagen,
      uuid: imagen.uuid,
      idTipoImagenDocumento: imagen.idTipoImagenDocumento,
      thumbnailUrl: null,
      uploading: false,
      saving: false,
      saveSuccess: false,
      error: null,
    };
  }

  private uploadFile(localId: number, file: File): void {
    this.patchCard(localId, { uploading: true, saveSuccess: false, error: null });
    this.imagenService.upload(file).subscribe({
      next: (result) => {
        if (!this.findCard(localId)) {
          return;
        }
        if (result.uploadError || !result.filename) {
          this.patchCard(localId, {
            uploading: false,
            error: result.frontError || 'No se pudo subir el archivo. Intenta de nuevo.',
          });
          return;
        }
        this.patchCard(localId, { uuid: result.filename, uploading: false });
        this.loadThumbnail(localId, result.filename);
        this.saveAfterReplace(localId);
      },
      error: () => {
        this.patchCard(localId, {
          uploading: false,
          error: 'No se pudo subir el archivo. Intenta de nuevo.',
        });
      },
    });
  }

  private loadThumbnail(localId: number, uuid: string): void {
    this.imagenService.getThumbnail(uuid).subscribe({
      next: (blob) => {
        const card = this.findCard(localId);
        if (!card) {
          return;
        }
        if (card.thumbnailUrl) {
          URL.revokeObjectURL(card.thumbnailUrl);
        }
        this.patchCard(localId, { thumbnailUrl: URL.createObjectURL(blob) });
      },
      error: () => {
        const card = this.findCard(localId);
        if (!card?.error) {
          this.patchCard(localId, {
            error: 'No se pudo obtener la vista previa de la imagen.',
          });
        }
      },
    });
  }

  private saveAfterReplace(localId: number): void {
    const card = this.findCard(localId);
    if (card?.idImagen && card.idTipoImagenDocumento && card.uuid) {
      this.saveCard(localId);
    }
  }

  private saveCard(localId: number): void {
    const card = this.findCard(localId);
    if (!card?.uuid || !card.idTipoImagenDocumento) {
      return;
    }

    const imagen: Imagen = {
      ...(card.idImagen !== undefined ? { idImagen: card.idImagen } : {}),
      idPersona: this.idPersona(),
      uuid: card.uuid,
      idTipoImagenDocumento: card.idTipoImagenDocumento,
    };

    this.patchCard(localId, { saving: true, saveSuccess: false, error: null });
    const request = card.idImagen
      ? this.imagenService.update(imagen)
      : this.imagenService.create(imagen);

    request.subscribe({
      next: (saved) => {
        this.patchCard(localId, {
          idImagen: saved.idImagen,
          uuid: saved.uuid ?? card.uuid,
          idTipoImagenDocumento: saved.idTipoImagenDocumento ?? card.idTipoImagenDocumento,
          saving: false,
          saveSuccess: true,
          error: null,
        });
      },
      error: () => {
        this.patchCard(localId, {
          saving: false,
          error: 'No se pudo guardar la imagen. Intenta de nuevo.',
        });
      },
    });
  }

  private findCard(localId: number): ImagenCard | undefined {
    return this.images().find((card) => card.localId === localId);
  }

  private patchCard(localId: number, patch: Partial<ImagenCard>): void {
    this.images.update((cards) =>
      cards.map((card) => (card.localId === localId ? { ...card, ...patch } : card)),
    );
  }

  private revokeAllThumbnails(): void {
    for (const card of this.images()) {
      if (card.thumbnailUrl) {
        URL.revokeObjectURL(card.thumbnailUrl);
      }
    }
  }
}
