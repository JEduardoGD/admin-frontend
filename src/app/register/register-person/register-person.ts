import {
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
  output,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { PersonaService, Persona } from './persona.service';
import { Imagen, ImagenService } from '../register-imagen/imagen.service';
import { CameraCapture } from './camera-capture/camera-capture';

export interface PersonalPhoto {
  localId: number;
  idImagen?: number;
  uuid: string;
  thumbnailUrl: string | null;
}

@Component({
  selector: 'app-register-person',
  imports: [ReactiveFormsModule, CameraCapture],
  templateUrl: './register-person.html',
  styleUrl: './register-person.css',
})
export class RegisterPerson {
  private static readonly PERSONAL_PHOTO_TIPO = 1;

  private readonly fb = inject(FormBuilder);
  private readonly personaService = inject(PersonaService);
  private readonly imagenService = inject(ImagenService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cameraCapture = viewChild<CameraCapture>('cameraCapture');

  readonly personaSaved = output<number>();

  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly photos = signal<Array<PersonalPhoto>>([]);
  readonly photosLoading = signal(false);
  readonly photoError = signal<string | null>(null);

  private nextPhotoId = 0;
  private loadedPhotosPersonaId: number | null = null;

  readonly idPersona = input.required<number>();

  readonly canCapture = computed(() => !!this.idPersona());

  readonly personaForm = this.fb.nonNullable.group({
    idPersona: [''],
    nombre: ['', [Validators.required, Validators.maxLength(250)]],
    primerApellido: ['', [Validators.required, Validators.maxLength(250)]],
    segundoApellido: ['', [Validators.maxLength(250)]],
    fecNac: [''],
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.revokePhotoThumbnails());
    effect(() => {
      const personaId = this.idPersona();
      if (personaId) {
        this.loadPersona(personaId);
        if (personaId !== this.loadedPhotosPersonaId) {
          this.loadedPhotosPersonaId = personaId;
          this.loadPhotos(personaId);
        }
      }
    });
  }

  private loadPersona(idPersona: number): void {
    this.personaService.findById(idPersona).subscribe({
      next: (persona) => {
        this.personaForm.patchValue({
          idPersona: persona.idPersona?.toString() ?? '',
          nombre: persona.nombre,
          primerApellido: persona.primerApellido,
          segundoApellido: persona.segundoApellido ?? '',
          fecNac: persona.fecNac ? formatDate(persona.fecNac, 'yyyy-MM-dd', 'en-US') : '',
        });
      },
    });
  }

  onSubmit(): void {
    if (this.personaForm.invalid) {
      this.personaForm.markAllAsTouched();
      return;
    }

    const value = this.personaForm.getRawValue();
    const idPersona = value.idPersona ? Number(value.idPersona) : undefined;
    const persona: Persona = {
      ...(idPersona !== undefined ? { idPersona } : {}),
      nombre: value.nombre,
      primerApellido: value.primerApellido,
      segundoApellido: value.segundoApellido || null,
      fecNac: value.fecNac || null,
    };

    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    if (idPersona !== undefined) {
      this.update(persona);
      return;
    }

    this.personaService
      .search({
        nombre: persona.nombre,
        primerApellido: persona.primerApellido,
        segundoApellido: persona.segundoApellido || undefined,
        fecNac: persona.fecNac || undefined,
      })
      .subscribe({
        next: (existing) => {
          if (existing && existing.length > 0) {
            this.confirmDuplicate(persona);
          } else {
            this.create(persona);
          }
        },
        error: () => {
          this.create(persona);
        },
      });
  }

  private confirmDuplicate(persona: Persona): void {
    Swal.fire({
      icon: 'warning',
      title: 'Persona ya registrada',
      text: 'Ya existe una persona con datos similares. ¿Deseas continuar con un nuevo registro similar?',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.create(persona);
      } else {
        this.saving.set(false);
      }
    });
  }

  private create(persona: Persona): void {
    this.personaService.create(persona).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.personaForm.patchValue({
          idPersona: saved.idPersona?.toString() ?? '',
          nombre: saved.nombre,
          primerApellido: saved.primerApellido,
          segundoApellido: saved.segundoApellido ?? '',
          fecNac: persona.fecNac ? formatDate(persona.fecNac, 'yyyy-MM-dd', 'en-US') : '',
        });
        if (saved.idPersona) {
          this.personaSaved.emit(saved.idPersona);
        }
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('No se pudo guardar la persona. Intenta de nuevo.');
      },
    });
  }

  private update(persona: Persona): void {
    this.personaService.update(persona).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.personaForm.patchValue({
          idPersona: saved.idPersona?.toString() ?? '',
          nombre: saved.nombre,
          primerApellido: saved.primerApellido,
          segundoApellido: saved.segundoApellido ?? '',
          fecNac: saved.fecNac ?? '',
        });
        if (saved.idPersona) {
          this.personaSaved.emit(saved.idPersona);
        }
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('No se pudo guardar la persona. Intenta de nuevo.');
      },
    });
  }

  openCamera(): void {
    if (!this.canCapture()) {
      return;
    }
    this.cameraCapture()?.open();
  }

  onPhotoCaptured(file: File): void {
    const idPersona = this.idPersona();
    if (!idPersona) {
      return;
    }

    this.photoError.set(null);
    this.imagenService.upload(file).subscribe({
      next: (result) => {
        if (result.uploadError || !result.filename) {
          this.photoError.set(result.frontError || 'No se pudo subir la foto. Intenta de nuevo.');
          return;
        }
        const uuid = result.filename;
        const localId = ++this.nextPhotoId;
        this.photos.update((photos) => [{ localId, uuid, thumbnailUrl: null }, ...photos]);
        this.loadPhotoThumbnail(localId, uuid);

        const imagen: Imagen = {
          idPersona,
          uuid,
          idTipoImagenDocumento: RegisterPerson.PERSONAL_PHOTO_TIPO,
        };
        this.imagenService.create(imagen).subscribe({
          next: (saved) => {
            this.patchPhoto(localId, {
              idImagen: saved.idImagen,
              uuid: saved.uuid ?? uuid,
            });
          },
          error: () =>
            this.photoError.set('La foto se subió pero no se pudo guardar. Intenta de nuevo.'),
        });
      },
      error: () => this.photoError.set('No se pudo subir la foto. Intenta de nuevo.'),
    });
  }

  private loadPhotos(idPersona: number): void {
    this.photosLoading.set(true);
    this.photoError.set(null);
    this.imagenService.findByIdPersona(idPersona).subscribe({
      next: (imagenes) => {
        this.revokePhotoThumbnails();
        const cards = (imagenes ?? [])
          .filter(
            (imagen) =>
              imagen.idTipoImagenDocumento === RegisterPerson.PERSONAL_PHOTO_TIPO &&
              (imagen.idAfiliacion === null || imagen.idAfiliacion === undefined),
          )
          .map((imagen) => this.toPhotoCard(imagen));
        this.photos.set(cards);
        this.photosLoading.set(false);
        for (const card of cards) {
          this.loadPhotoThumbnail(card.localId, card.uuid);
        }
      },
      error: () => {
        this.photosLoading.set(false);
        this.photoError.set('No se pudieron cargar las fotos.');
      },
    });
  }

  private toPhotoCard(imagen: Imagen): PersonalPhoto {
    return {
      localId: ++this.nextPhotoId,
      idImagen: imagen.idImagen,
      uuid: imagen.uuid,
      thumbnailUrl: null,
    };
  }

  private loadPhotoThumbnail(localId: number, uuid: string): void {
    this.imagenService.getThumbnail(uuid).subscribe({
      next: (blob) => {
        const photo = this.photos().find((item) => item.localId === localId);
        if (!photo) {
          return;
        }
        if (photo.thumbnailUrl) {
          URL.revokeObjectURL(photo.thumbnailUrl);
        }
        this.patchPhoto(localId, { thumbnailUrl: URL.createObjectURL(blob) });
      },
      error: () => undefined,
    });
  }

  private patchPhoto(localId: number, patch: Partial<PersonalPhoto>): void {
    this.photos.update((photos) =>
      photos.map((photo) => (photo.localId === localId ? { ...photo, ...patch } : photo)),
    );
  }

  private revokePhotoThumbnails(): void {
    for (const photo of this.photos()) {
      if (photo.thumbnailUrl) {
        URL.revokeObjectURL(photo.thumbnailUrl);
      }
    }
  }
}
