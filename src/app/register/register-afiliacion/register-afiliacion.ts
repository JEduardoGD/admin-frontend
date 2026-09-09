import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ErrorHandlerService } from '../../core/error-handler.service';
import { forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { Imagen, ImagenService, TipoImagen } from '../register-imagen/imagen.service';
import { Afiliacion, AfiliacionService, Estado } from './afiliacion.service';

export type ImageSlot = 'pago' | 'solicitud';

export function todayIso(from = new Date()): string {
  return formatDate(from, 'yyyy-MM-dd', 'en-US');
}

export function plusYearsIso(years: number, from = new Date()): string {
  const next = new Date(from.getTime());
  next.setFullYear(next.getFullYear() + years);
  return formatDate(next, 'yyyy-MM-dd', 'en-US');
}

export function toInputDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate) {
      return isoDate[1];
    }
  }
  return formatDate(value, 'yyyy-MM-dd', 'en-US');
}

interface AfiliacionImage {
  idImagen?: number;
  uuid: string | null;
  thumbnailUrl: string | null;
  uploading: boolean;
  error: string | null;
  dirty: boolean;
}

function emptyImage(): AfiliacionImage {
  return {
    uuid: null,
    thumbnailUrl: null,
    uploading: false,
    error: null,
    dirty: false,
  };
}

function emptyImages(): Record<ImageSlot, AfiliacionImage> {
  return { pago: emptyImage(), solicitud: emptyImage() };
}

function afiliacionDatesValidator(group: AbstractControl): ValidationErrors | null {
  const fechaInicio = (group.get('fechaInicio')?.value as string) || '';
  const fechaFin = (group.get('fechaFin')?.value as string) || '';
  const vitalicia = Boolean(group.get('vitalicia')?.value);

  if (!fechaFin) {
    return vitalicia ? null : { fechaFinRequired: true };
  }
  if (fechaInicio && fechaInicio >= fechaFin) {
    return { fechaOrder: true };
  }
  return null;
}

@Component({
  selector: 'app-register-afiliacion',
  imports: [ReactiveFormsModule],
  templateUrl: './register-afiliacion.html',
  styleUrl: './register-afiliacion.css',
})
export class RegisterAfiliacion {
  private readonly fb = inject(FormBuilder);
  private readonly afiliacionService = inject(AfiliacionService);
  private readonly imagenService = inject(ImagenService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idPersona = input.required<number>();

  readonly afiliaciones = signal<Array<Afiliacion>>([]);
  readonly imagenes = signal<Array<Imagen>>([]);
  readonly tipos = signal<Array<TipoImagen>>([]);
  readonly estados = signal<Array<Estado>>([]);
  readonly estadosError = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly tiposError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly imageError = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly deletingId = signal<number | null>(null);
  readonly images = signal<Record<ImageSlot, AfiliacionImage>>(emptyImages());
  readonly thumbnails = signal<Record<number, string>>({});

  readonly afiliacionForm = this.fb.nonNullable.group(
    {
      idAfiliacion: [''],
      idEstado: ['', Validators.required],
      fechaInicio: [todayIso(), Validators.required],
      fechaFin: [plusYearsIso(1)],
      vitalicia: [false],
    },
    { validators: afiliacionDatesValidator },
  );

  readonly tipoPago = this.computeTipo('PAGO');
  readonly tipoSolicitud = this.computeTipo('SOLICITUD');

  private syncing = false;
  private loadedPersonaId: number | null = null;
  private readonly objectUrls = new Set<string>();
  private readonly pendingTableThumbs = new Set<number>();

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeAllObjectUrls());
    this.loadTipos();
    this.loadEstados();

    this.afiliacionForm.controls.vitalicia.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((vitalicia) => this.onVitaliciaChange(vitalicia));
    this.afiliacionForm.controls.fechaFin.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((fechaFin) => this.onFechaFinChange(fechaFin));

    effect(() => {
      const idPersona = this.idPersona();
      if (idPersona && idPersona !== this.loadedPersonaId) {
        this.loadedPersonaId = idPersona;
        this.resetForm();
        this.loadAfiliaciones(idPersona);
        this.loadImagenes(idPersona);
      }
    });
  }

  formatFecha(value: string | number | Date | null | undefined): string {
    return toInputDate(value) || '—';
  }

  formatDateTime(value: string | number | Date | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
      return '—';
    }
    return formatDate(date, 'yyyy-MM-dd HH:mm', 'en-US');
  }

  slotLabel(slot: ImageSlot): string {
    return slot === 'pago' ? 'de pago' : 'de solicitud';
  }

  estadoLabel(estado: Estado): string {
    return `${estado.abreviado} - ${estado.nombre}`;
  }

  estadoAbreviado(afiliacion: Afiliacion): string {
    console.log('----------------------------');
    console.log(this.estados());
    console.log(afiliacion.idEstado);
    console.log('----------------------------');
    if (afiliacion.idEstado === null || afiliacion.idEstado === undefined) {
      return '—';
    }
    return (
      this.estados().find((estado) => estado.idEstado === afiliacion.idEstado)?.abreviado ?? '—'
    );
  }

  onSelectFile(event: Event, slot: ImageSlot): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.imageError.set(null);
    this.patchImage(slot, { uploading: true, error: null, dirty: true });
    this.imagenService.upload(file).subscribe({
      next: (result) => {
        if (result.uploadError || !result.filename) {
          this.patchImage(slot, {
            uploading: false,
            error: result.frontError || 'No se pudo subir el archivo. Intenta de nuevo.',
          });
          return;
        }
        this.patchImage(slot, { uuid: result.filename, uploading: false });
        this.loadThumbnail(slot, result.filename);
      },
      error: () => {
        this.patchImage(slot, {
          uploading: false,
          error: 'No se pudo subir el archivo. Intenta de nuevo.',
        });
      },
    });
  }

  onSubmit(): void {
    if (this.afiliacionForm.invalid) {
      this.afiliacionForm.markAllAsTouched();
      return;
    }
    if (!this.tipoPago() || !this.tipoSolicitud()) {
      this.imageError.set('No se encontraron los tipos de imagen PAGO y SOLICITUD en el catálogo.');
      return;
    }
    const missing = this.missingImagesError();
    if (missing) {
      this.imageError.set(missing);
      return;
    }

    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);
    this.imageError.set(null);

    const payload = this.toPayload(false);
    const afiliacionRequest = payload.idAfiliacion
      ? this.afiliacionService.update(payload)
      : this.afiliacionService.create(payload);

    afiliacionRequest
      .pipe(
        switchMap((savedAfiliacion) => {
          const idAfiliacion = savedAfiliacion?.idAfiliacion;
          if (idAfiliacion === undefined) {
            return throwError(() => new Error('missing idAfiliacion'));
          }
          return forkJoin({
            pago: this.saveImage('pago', idAfiliacion),
            solicitud: this.saveImage('solicitud', idAfiliacion),
          });
        }),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saveSuccess.set(true);
          this.resetForm({ keepSuccess: true });
          this.loadAfiliaciones(this.idPersona());
          this.loadImagenes(this.idPersona());
        },
        error: (err: unknown) => {
          this.saving.set(false);
          if (!this.errorHandler.showServerError(err)) {
            this.saveError.set('No se pudo guardar la afiliación. Intenta de nuevo.');
          }
        },
      });
  }

  onEdit(afiliacion: Afiliacion): void {
    if (afiliacion.deleted || afiliacion.idAfiliacion === undefined) {
      return;
    }

    this.syncing = true;
    this.saveSuccess.set(false);
    this.saveError.set(null);
    this.imageError.set(null);
    this.editingId.set(afiliacion.idAfiliacion);

    const vitalicia = afiliacion.vitalicia || !afiliacion.fechaFin;
    this.afiliacionForm.enable();
    this.afiliacionForm.patchValue({
      idAfiliacion: String(afiliacion.idAfiliacion),
      idEstado:
        afiliacion.idEstado === null || afiliacion.idEstado === undefined
          ? ''
          : String(afiliacion.idEstado),
      fechaInicio: toInputDate(afiliacion.fechaInicio),
      fechaFin: vitalicia ? '' : toInputDate(afiliacion.fechaFin),
      vitalicia,
    });
    if (vitalicia) {
      this.afiliacionForm.controls.fechaFin.disable({ emitEvent: false });
    } else {
      this.afiliacionForm.controls.fechaFin.enable({ emitEvent: false });
    }
    this.setImagesFromAfiliacion(afiliacion);
    this.syncing = false;
  }

  onCancelEdit(): void {
    this.resetForm();
  }

  onDelete(afiliacion: Afiliacion): void {
    if (afiliacion.deleted || afiliacion.idAfiliacion === undefined || this.deletingId()) {
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Eliminar afiliación',
      text: '¿Deseas eliminar esta afiliación? Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }
      this.deleteAfiliacion(afiliacion);
    });
  }

  thumbnailFor(afiliacion: Afiliacion, slot: ImageSlot): string | null {
    const idImagen = this.findImagenForAfiliacion(afiliacion.idAfiliacion, slot)?.idImagen;
    if (idImagen === undefined) {
      return null;
    }
    return this.thumbnails()[idImagen] ?? null;
  }

  private findImagenForAfiliacion(
    idAfiliacion: number | undefined,
    slot: ImageSlot,
  ): Imagen | undefined {
    const idTipo = this.idTipoFor(slot);
    if (idAfiliacion === undefined || idTipo === null) {
      return undefined;
    }
    return this.imagenes().find(
      (imagen) => imagen.idAfiliacion === idAfiliacion && imagen.idTipoImagenDocumento === idTipo,
    );
  }

  private deleteAfiliacion(afiliacion: Afiliacion): void {
    const idAfiliacion = afiliacion.idAfiliacion;
    if (idAfiliacion === undefined) {
      return;
    }

    this.deletingId.set(idAfiliacion);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const payload: Afiliacion = {
      idAfiliacion,
      idPersona: this.idPersona(),
      idEstado: afiliacion.idEstado,
      fechaInicio: toInputDate(afiliacion.fechaInicio),
      fechaFin: afiliacion.fechaFin ? toInputDate(afiliacion.fechaFin) : null,
      vitalicia: afiliacion.vitalicia,
      deleted: true,
    };

    this.afiliacionService.update(payload).subscribe({
      next: () => {
        this.deletingId.set(null);
        if (this.editingId() === idAfiliacion) {
          this.resetForm();
        }
        this.loadAfiliaciones(this.idPersona());
      },
      error: (err: unknown) => {
        this.deletingId.set(null);
        if (!this.errorHandler.showServerError(err)) {
          this.saveError.set('No se pudo eliminar la afiliación. Intenta de nuevo.');
        }
      },
    });
  }

  private loadAfiliaciones(idPersona: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.afiliacionService.findByIdPersona(idPersona).subscribe({
      next: (afiliaciones) => {
        this.afiliaciones.set(afiliaciones ?? []);
        this.loading.set(false);
        this.ensureTableThumbnails();
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudieron cargar las afiliaciones.');
      },
    });
  }

  private loadImagenes(idPersona: number): void {
    this.imagenService.findByIdPersona(idPersona).subscribe({
      next: (imagenes) => {
        this.imagenes.set(imagenes ?? []);
        this.ensureTableThumbnails();
      },
      error: () => this.imagenes.set([]),
    });
  }

  private loadEstados(): void {
    this.afiliacionService.listEstados().subscribe({
      next: (estados) => {
        this.estados.set(estados ?? []);
        this.estadosError.set(null);
      },
      error: () => this.estadosError.set('No se pudieron cargar los estados.'),
    });
  }

  private loadTipos(): void {
    this.imagenService.listTiposForAfiliacion().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos ?? []);
        this.tiposError.set(
          this.tipoPago() && this.tipoSolicitud()
            ? null
            : 'No se encontraron los tipos de imagen PAGO y SOLICITUD en el catálogo.',
        );
      },
      error: () => this.tiposError.set('No se pudieron cargar los tipos de imagen.'),
    });
  }

  private computeTipo(nombre: string): () => TipoImagen | undefined {
    return () =>
      this.tipos().find((tipo) => tipo.tipo.trim().toUpperCase() === nombre.toUpperCase());
  }

  private idTipoFor(slot: ImageSlot): number | null {
    return (
      (slot === 'pago' ? this.tipoPago()?.idTipoImagen : this.tipoSolicitud()?.idTipoImagen) ?? null
    );
  }

  private hasSlotImage(slot: ImageSlot): boolean {
    const image = this.images()[slot];
    if (image.idImagen && !image.dirty) {
      return true;
    }
    return Boolean(image.uuid && this.idTipoFor(slot));
  }

  private missingImagesError(): string | null {
    const missing: Array<ImageSlot> = (['pago', 'solicitud'] as Array<ImageSlot>).filter(
      (slot) => !this.hasSlotImage(slot),
    );
    if (missing.length === 0) {
      return null;
    }
    if (missing.length === 2) {
      return 'Las imágenes de pago y de solicitud son obligatorias.';
    }
    return `La imagen ${this.slotLabel(missing[0])} es obligatoria.`;
  }

  private saveImage(slot: ImageSlot, idAfiliacion: number): Observable<number> {
    const image = this.images()[slot];
    if (image.idImagen && !image.dirty) {
      return of(image.idImagen);
    }
    const idTipoImagenDocumento = this.idTipoFor(slot);
    if (!image.uuid || !idTipoImagenDocumento) {
      return throwError(() => new Error(`image required: ${slot}`));
    }

    const imagen: Imagen = {
      ...(image.idImagen !== undefined ? { idImagen: image.idImagen } : {}),
      idPersona: this.idPersona(),
      idAfiliacion,
      uuid: image.uuid,
      idTipoImagenDocumento,
    };
    const request = image.idImagen
      ? this.imagenService.update(imagen)
      : this.imagenService.create(imagen);

    return request.pipe(
      map((saved) => {
        if (saved.idImagen === undefined) {
          throw new Error(`image required: ${slot}`);
        }
        this.patchImage(slot, { idImagen: saved.idImagen, dirty: false });
        return saved.idImagen;
      }),
    );
  }

  private setImagesFromAfiliacion(afiliacion: Afiliacion): void {
    for (const slot of ['pago', 'solicitud'] as Array<ImageSlot>) {
      const saved = this.findImagenForAfiliacion(afiliacion.idAfiliacion, slot);
      this.replaceImage(slot, {
        idImagen: saved?.idImagen,
        uuid: saved?.uuid ?? null,
        thumbnailUrl: null,
        uploading: false,
        error: null,
        dirty: false,
      });
      if (saved?.uuid) {
        this.loadThumbnail(slot, saved.uuid);
      } else if (saved?.idImagen !== undefined) {
        this.loadSlotThumbnailById(slot, saved.idImagen);
      }
    }
  }

  private ensureTableThumbnails(): void {
    for (const afiliacion of this.afiliaciones()) {
      for (const slot of ['pago', 'solicitud'] as Array<ImageSlot>) {
        const imagen = this.findImagenForAfiliacion(afiliacion.idAfiliacion, slot);
        const idImagen = imagen?.idImagen;
        if (imagen === undefined || idImagen === undefined) {
          continue;
        }
        if (this.thumbnails()[idImagen] || this.pendingTableThumbs.has(idImagen)) {
          continue;
        }
        this.pendingTableThumbs.add(idImagen);
        this.loadTableThumbnail(idImagen, imagen.uuid);
      }
    }
  }

  private loadTableThumbnail(idImagen: number, uuid: string | null | undefined): void {
    const thumbnail$ = uuid
      ? this.imagenService.getThumbnail(uuid)
      : this.imagenService
          .findById(idImagen)
          .pipe(
            switchMap((imagen) =>
              imagen?.uuid
                ? this.imagenService.getThumbnail(imagen.uuid)
                : throwError(() => new Error(`missing uuid for image ${idImagen}`)),
            ),
          );

    thumbnail$.subscribe({
      next: (blob) => {
        this.pendingTableThumbs.delete(idImagen);
        const url = this.createObjectUrl(blob);
        this.thumbnails.update((current) => ({ ...current, [idImagen]: url }));
      },
      error: () => this.pendingTableThumbs.delete(idImagen),
    });
  }

  private loadThumbnail(slot: ImageSlot, uuid: string): void {
    this.imagenService.getThumbnail(uuid).subscribe({
      next: (blob) => {
        const previous = this.images()[slot].thumbnailUrl;
        this.patchImage(slot, { thumbnailUrl: this.createObjectUrl(blob) });
        this.revokeObjectUrl(previous);
      },
      error: () => {
        if (!this.images()[slot].error) {
          this.patchImage(slot, { error: 'No se pudo obtener la vista previa de la imagen.' });
        }
      },
    });
  }

  private loadSlotThumbnailById(slot: ImageSlot, idImagen: number): void {
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
          const previous = this.images()[slot].thumbnailUrl;
          this.patchImage(slot, { thumbnailUrl: this.createObjectUrl(blob) });
          this.revokeObjectUrl(previous);
        },
        error: () => {
          if (!this.images()[slot].error) {
            this.patchImage(slot, { error: 'No se pudo obtener la vista previa de la imagen.' });
          }
        },
      });
  }

  private patchImage(slot: ImageSlot, patch: Partial<AfiliacionImage>): void {
    this.images.update((current) => ({ ...current, [slot]: { ...current[slot], ...patch } }));
  }

  private replaceImage(slot: ImageSlot, next: AfiliacionImage): void {
    this.revokeObjectUrl(this.images()[slot].thumbnailUrl);
    this.images.update((current) => ({ ...current, [slot]: next }));
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

  private onVitaliciaChange(vitalicia: boolean): void {
    if (this.syncing) {
      return;
    }
    this.syncing = true;
    const fechaFin = this.afiliacionForm.controls.fechaFin;
    if (vitalicia) {
      fechaFin.setValue('', { emitEvent: false });
      fechaFin.disable({ emitEvent: false });
    } else {
      fechaFin.enable({ emitEvent: false });
      if (!fechaFin.value) {
        fechaFin.setValue(plusYearsIso(1), { emitEvent: false });
      }
    }
    this.afiliacionForm.updateValueAndValidity();
    this.syncing = false;
  }

  private onFechaFinChange(fechaFin: string): void {
    if (this.syncing) {
      return;
    }
    this.syncing = true;
    if (!fechaFin) {
      this.afiliacionForm.controls.vitalicia.setValue(true, { emitEvent: false });
      this.afiliacionForm.controls.fechaFin.disable({ emitEvent: false });
    } else if (this.afiliacionForm.controls.vitalicia.value) {
      this.afiliacionForm.controls.vitalicia.setValue(false, { emitEvent: false });
    }
    this.afiliacionForm.updateValueAndValidity();
    this.syncing = false;
  }

  private resetForm(options?: { keepSuccess?: boolean }): void {
    this.syncing = true;
    this.editingId.set(null);
    this.saving.set(false);
    if (!options?.keepSuccess) {
      this.saveSuccess.set(false);
    }
    this.saveError.set(null);
    this.imageError.set(null);
    for (const slot of ['pago', 'solicitud'] as Array<ImageSlot>) {
      this.replaceImage(slot, emptyImage());
    }
    this.afiliacionForm.enable();
    this.afiliacionForm.reset({
      idAfiliacion: '',
      idEstado: '',
      fechaInicio: todayIso(),
      fechaFin: plusYearsIso(1),
      vitalicia: false,
    });
    this.afiliacionForm.controls.fechaFin.enable({ emitEvent: false });
    this.syncing = false;
  }

  private toPayload(deleted: boolean): Afiliacion {
    const value = this.afiliacionForm.getRawValue();
    const idAfiliacion = value.idAfiliacion ? Number(value.idAfiliacion) : undefined;
    const vitalicia = value.vitalicia;
    return {
      ...(idAfiliacion !== undefined ? { idAfiliacion } : {}),
      idPersona: this.idPersona(),
      idEstado: Number(value.idEstado),
      fechaInicio: value.fechaInicio,
      fechaFin: vitalicia || !value.fechaFin ? null : value.fechaFin,
      vitalicia,
      deleted,
    };
  }
}
