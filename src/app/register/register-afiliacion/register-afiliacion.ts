import { Component, effect, inject, input, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Swal from 'sweetalert2';
import { Afiliacion, AfiliacionService } from './afiliacion.service';

export function todayIso(from = new Date()): string {
  return formatDate(from, 'yyyy-MM-dd', 'en-US');
}

export function plusYearsIso(years: number, from = new Date()): string {
  const next = new Date(from.getTime());
  next.setFullYear(next.getFullYear() + years);
  return formatDate(next, 'yyyy-MM-dd', 'en-US');
}

function toInputDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return isoDate?.[1] ?? formatDate(value, 'yyyy-MM-dd', 'en-US');
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

  readonly idPersona = input.required<number>();

  readonly afiliaciones = signal<Array<Afiliacion>>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly deletingId = signal<number | null>(null);

  readonly afiliacionForm = this.fb.nonNullable.group(
    {
      idAfiliacion: [''],
      fechaInicio: [todayIso(), Validators.required],
      fechaFin: [plusYearsIso(1)],
      vitalicia: [false],
    },
    { validators: afiliacionDatesValidator },
  );

  private syncing = false;
  private loadedPersonaId: number | null = null;

  constructor() {
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
      }
    });
  }

  onSubmit(): void {
    if (this.afiliacionForm.invalid) {
      this.afiliacionForm.markAllAsTouched();
      return;
    }

    const payload = this.toPayload(false);
    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    this.afiliacionService.save(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.resetForm({ keepSuccess: true });
        this.loadAfiliaciones(this.idPersona());
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('No se pudo guardar la afiliación. Intenta de nuevo.');
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
    this.editingId.set(afiliacion.idAfiliacion);

    const vitalicia = afiliacion.vitalicia || !afiliacion.fechaFin;
    this.afiliacionForm.enable();
    this.afiliacionForm.patchValue({
      idAfiliacion: String(afiliacion.idAfiliacion),
      fechaInicio: toInputDate(afiliacion.fechaInicio),
      fechaFin: vitalicia ? '' : toInputDate(afiliacion.fechaFin),
      vitalicia,
    });
    if (vitalicia) {
      this.afiliacionForm.controls.fechaFin.disable({ emitEvent: false });
    } else {
      this.afiliacionForm.controls.fechaFin.enable({ emitEvent: false });
    }
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
      fechaInicio: afiliacion.fechaInicio,
      fechaFin: afiliacion.fechaFin,
      vitalicia: afiliacion.vitalicia,
      deleted: true,
    };

    this.afiliacionService.save(payload).subscribe({
      next: () => {
        this.deletingId.set(null);
        if (this.editingId() === idAfiliacion) {
          this.resetForm();
        }
        this.loadAfiliaciones(this.idPersona());
      },
      error: () => {
        this.deletingId.set(null);
        this.saveError.set('No se pudo eliminar la afiliación. Intenta de nuevo.');
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
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudieron cargar las afiliaciones.');
      },
    });
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
    this.afiliacionForm.enable();
    this.afiliacionForm.reset({
      idAfiliacion: '',
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
      fechaInicio: value.fechaInicio,
      fechaFin: vitalicia || !value.fechaFin ? null : value.fechaFin,
      vitalicia,
      deleted,
    };
  }
}
