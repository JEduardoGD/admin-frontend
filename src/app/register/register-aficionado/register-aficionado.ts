import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ErrorHandlerService } from '../../core/error-handler.service';
import { map, Observable, of, switchMap, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { Imagen, ImagenService, TipoImagen } from '../register-imagen/imagen.service';
import { todayIso, toInputDate } from '../register-afiliacion/register-afiliacion';
import { Aficionado, AficionadoService } from './aficionado.service';

interface AficionadoImage {
  idImagen?: number;
  uuid: string | null;
  thumbnailUrl: string | null;
  uploading: boolean;
  error: string | null;
  dirty: boolean;
}

function emptyImage(): AficionadoImage {
  return {
    uuid: null,
    thumbnailUrl: null,
    uploading: false,
    error: null,
    dirty: false,
  };
}

function aficionadoDatesValidator(group: AbstractControl): ValidationErrors | null {
  const fechaInicio = (group.get('fechaInicio')?.value as string) || '';
  const fechaFin = (group.get('fechaFin')?.value as string) || '';
  if (fechaInicio && fechaFin && fechaInicio >= fechaFin) {
    return { fechaOrder: true };
  }
  return null;
}

@Component({
  selector: 'app-register-aficionado',
  imports: [ReactiveFormsModule],
  templateUrl: './register-aficionado.html',
  styleUrl: './register-aficionado.css',
})
export class RegisterAficionado {
  private readonly fb = inject(FormBuilder);
  private readonly aficionadoService = inject(AficionadoService);
  private readonly imagenService = inject(ImagenService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idPersona = input.required<number>();

  readonly aficionados = signal<Array<Aficionado>>([]);
  readonly imagenes = signal<Array<Imagen>>([]);
  readonly tipos = signal<Array<TipoImagen>>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly tiposError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly imageError = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly deletingId = signal<number | null>(null);
  readonly image = signal<AficionadoImage>(emptyImage());

  readonly aficionadoForm = this.fb.nonNullable.group(
    {
      idAficionado: [''],
      indicativo: ['', Validators.required],
      fechaInicio: [todayIso()],
      fechaFin: [''],
    },
    { validators: aficionadoDatesValidator },
  );

  readonly tipoCertificado = this.computeTipo('CERTIFICADO');

  private loadedPersonaId: number | null = null;
  private readonly objectUrls = new Set<string>();

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeAllObjectUrls());
    this.loadTipos();

    effect(() => {
      const idPersona = this.idPersona();
      if (idPersona && idPersona !== this.loadedPersonaId) {
        this.loadedPersonaId = idPersona;
        this.resetForm();
        this.loadAficionados(idPersona);
        this.loadImagenes(idPersona);
      }
    });
  }

  formatFecha(value: string | number | Date | null | undefined): string {
    return toInputDate(value) || '—';
  }

  onSelectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.imageError.set(null);
    this.patchImage({ uploading: true, error: null, dirty: true });
    this.imagenService.upload(file).subscribe({
      next: (result) => {
        if (result.uploadError || !result.filename) {
          this.patchImage({
            uploading: false,
            error: result.frontError || 'No se pudo subir el archivo. Intenta de nuevo.',
          });
          return;
        }
        this.patchImage({ uuid: result.filename, uploading: false });
        this.loadThumbnail(result.filename);
      },
      error: () => {
        this.patchImage({
          uploading: false,
          error: 'No se pudo subir el archivo. Intenta de nuevo.',
        });
      },
    });
  }

  onSubmit(): void {
    if (this.aficionadoForm.invalid) {
      this.aficionadoForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);
    this.imageError.set(null);

    this.saveCertificado()
      .pipe(
        switchMap((idImagen) => {
          const payload = this.toPayload(idImagen);
          return payload.idAficionado
            ? this.aficionadoService.update(payload)
            : this.aficionadoService.create(payload);
        }),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saveSuccess.set(true);
          this.resetForm({ keepSuccess: true });
          this.loadAficionados(this.idPersona());
          this.loadImagenes(this.idPersona());
        },
        error: (err: unknown) => {
          this.saving.set(false);
          if (!this.errorHandler.showServerError(err)) {
            this.saveError.set('No se pudo guardar el aficionado. Intenta de nuevo.');
          }
        },
      });
  }

  onEdit(aficionado: Aficionado): void {
    if (aficionado.idAficionado === undefined) {
      return;
    }

    this.saveSuccess.set(false);
    this.saveError.set(null);
    this.imageError.set(null);
    this.editingId.set(aficionado.idAficionado);

    this.aficionadoForm.patchValue({
      idAficionado: String(aficionado.idAficionado),
      indicativo: aficionado.indicativo ?? '',
      fechaInicio: toInputDate(aficionado.fechaInicio),
      fechaFin: toInputDate(aficionado.fechaFin),
    });
    this.setImageFromAficionado(aficionado);
  }

  onCancelEdit(): void {
    this.resetForm();
  }

  onDelete(aficionado: Aficionado): void {
    if (aficionado.idAficionado === undefined || this.deletingId()) {
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Eliminar aficionado',
      text: '¿Deseas eliminar este aficionado? Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }
      this.deleteAficionado(aficionado);
    });
  }

  private deleteAficionado(aficionado: Aficionado): void {
    const idAficionado = aficionado.idAficionado;
    if (idAficionado === undefined) {
      return;
    }

    this.deletingId.set(idAficionado);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    this.aficionadoService.remove(idAficionado).subscribe({
      next: () => {
        this.deletingId.set(null);
        if (this.editingId() === idAficionado) {
          this.resetForm();
        }
        this.loadAficionados(this.idPersona());
      },
      error: (err: unknown) => {
        this.deletingId.set(null);
        if (!this.errorHandler.showServerError(err)) {
          this.saveError.set('No se pudo eliminar el aficionado. Intenta de nuevo.');
        }
      },
    });
  }

  private loadAficionados(idPersona: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.aficionadoService.findByIdPersona(idPersona).subscribe({
      next: (aficionados) => {
        this.aficionados.set(aficionados ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudieron cargar los aficionados.');
      },
    });
  }

  private loadImagenes(idPersona: number): void {
    this.imagenService.findByIdPersona(idPersona).subscribe({
      next: (imagenes) => {
        this.imagenes.set(imagenes ?? []);
      },
      error: () => this.imagenes.set([]),
    });
  }

  private loadTipos(): void {
    this.imagenService.listTipos().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos ?? []);
        this.tiposError.set(
          this.tipoCertificado()
            ? null
            : 'No se encontró el tipo de imagen CERTIFICADO en el catálogo.',
        );
      },
      error: () => this.tiposError.set('No se pudieron cargar los tipos de imagen.'),
    });
  }

  private computeTipo(nombre: string): () => TipoImagen | undefined {
    return () =>
      this.tipos().find((tipo) => tipo.tipo.trim().toUpperCase() === nombre.toUpperCase());
  }

  private saveCertificado(): Observable<number | null> {
    const image = this.image();
    if (!image.dirty && image.idImagen !== undefined) {
      return of(image.idImagen);
    }
    if (!image.uuid) {
      return of(image.idImagen ?? null);
    }
    const idTipoImagenDocumento = this.tipoCertificado()?.idTipoImagen;
    if (!idTipoImagenDocumento) {
      this.imageError.set('No se encontró el tipo de imagen CERTIFICADO en el catálogo.');
      return throwError(() => new Error('missing CERTIFICADO tipo'));
    }

    const imagen: Imagen = {
      ...(image.idImagen !== undefined ? { idImagen: image.idImagen } : {}),
      idPersona: this.idPersona(),
      uuid: image.uuid,
      idTipoImagenDocumento,
    };
    const request = image.idImagen
      ? this.imagenService.update(imagen)
      : this.imagenService.create(imagen);

    return request.pipe(
      map((saved) => {
        if (saved.idImagen === undefined) {
          throw new Error('missing idImagen');
        }
        this.image.update((current) => ({ ...current, idImagen: saved.idImagen, dirty: false }));
        return saved.idImagen;
      }),
    );
  }

  private setImageFromAficionado(aficionado: Aficionado): void {
    const idImagen = aficionado.idImagen ?? undefined;
    const saved =
      idImagen !== undefined
        ? this.imagenes().find((imagen) => imagen.idImagen === idImagen)
        : undefined;
    this.replaceImage({
      idImagen,
      uuid: saved?.uuid ?? null,
      thumbnailUrl: null,
      uploading: false,
      error: null,
      dirty: false,
    });
    if (saved?.uuid) {
      this.loadThumbnail(saved.uuid);
    } else if (idImagen !== undefined) {
      this.loadThumbnailById(idImagen);
    }
  }

  private loadThumbnail(uuid: string): void {
    this.imagenService.getThumbnail(uuid).subscribe({
      next: (blob) => {
        const previous = this.image().thumbnailUrl;
        this.patchImage({ thumbnailUrl: this.createObjectUrl(blob) });
        this.revokeObjectUrl(previous);
      },
      error: () => {
        if (!this.image().error) {
          this.patchImage({ error: 'No se pudo obtener la vista previa de la imagen.' });
        }
      },
    });
  }

  private loadThumbnailById(idImagen: number): void {
    this.imagenService
      .findById(idImagen)
      .pipe(
        switchMap((imagen) =>
          imagen?.uuid
            ? this.imagenService.getThumbnail(imagen.uuid)
            : throwError(() => new Error(`missing uuid for image ${idImagen}`)),
        ),
      )
      .subscribe({
        next: (blob) => {
          const previous = this.image().thumbnailUrl;
          this.patchImage({ thumbnailUrl: this.createObjectUrl(blob) });
          this.revokeObjectUrl(previous);
        },
        error: () => {
          if (!this.image().error) {
            this.patchImage({ error: 'No se pudo obtener la vista previa de la imagen.' });
          }
        },
      });
  }

  private patchImage(patch: Partial<AficionadoImage>): void {
    this.image.update((current) => ({ ...current, ...patch }));
  }

  private replaceImage(next: AficionadoImage): void {
    this.revokeObjectUrl(this.image().thumbnailUrl);
    this.image.set(next);
  }

  private createObjectUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.objectUrls.add(url);
    return url;
  }

  private revokeObjectUrl(url: string | null): void {
    if (url && this.objectUrls.delete(url)) {
      URL.revokeObjectURL(url);
    }
  }

  private revokeAllObjectUrls(): void {
    for (const url of this.objectUrls) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }

  private resetForm(options?: { keepSuccess?: boolean }): void {
    this.editingId.set(null);
    this.saving.set(false);
    if (!options?.keepSuccess) {
      this.saveSuccess.set(false);
    }
    this.saveError.set(null);
    this.imageError.set(null);
    this.replaceImage(emptyImage());
    this.aficionadoForm.reset({
      idAficionado: '',
      indicativo: '',
      fechaInicio: todayIso(),
      fechaFin: '',
    });
  }

  private toPayload(idImagen: number | null): Aficionado {
    const value = this.aficionadoForm.value;
    const idAficionado = value.idAficionado ? Number(value.idAficionado) : undefined;
    return {
      ...(idAficionado !== undefined ? { idAficionado } : {}),
      idPersona: this.idPersona(),
      indicativo: (value.indicativo ?? '').trim(),
      fechaInicio: value.fechaInicio || null,
      fechaFin: value.fechaFin || null,
      idImagen,
    };
  }
}
