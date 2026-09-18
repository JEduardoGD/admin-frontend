import { Component, effect, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ErrorHandlerService } from '../../core/error-handler.service';
import Swal from 'sweetalert2';
import { AfiliacionService, Estado } from '../register-afiliacion/afiliacion.service';
import { todayIso, toInputDate } from '../register-afiliacion/register-afiliacion';
import { Aspirante, AspiranteService } from './aspirante.service';

function aspiranteDatesValidator(group: AbstractControl): ValidationErrors | null {
  const fechaInicio = (group.get('fechaInicio')?.value as string) || '';
  const fechaFin = (group.get('fechaFin')?.value as string) || '';
  if (fechaInicio && fechaFin && fechaInicio >= fechaFin) {
    return { fechaOrder: true };
  }
  return null;
}

@Component({
  selector: 'app-register-aspirante',
  imports: [ReactiveFormsModule],
  templateUrl: './register-aspirante.html',
  styleUrl: './register-aspirante.css',
})
export class RegisterAspirante {
  private readonly fb = inject(FormBuilder);
  private readonly aspiranteService = inject(AspiranteService);
  private readonly afiliacionService = inject(AfiliacionService);
  private readonly errorHandler = inject(ErrorHandlerService);

  readonly idPersona = input.required<number>();

  readonly aspirantes = signal<Array<Aspirante>>([]);
  readonly estados = signal<Array<Estado>>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly estadosError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly deletingId = signal<number | null>(null);

  readonly aspiranteForm = this.fb.nonNullable.group(
    {
      idAspirante: [''],
      idEstado: ['', Validators.required],
      fechaInicio: [todayIso()],
      fechaFin: [''],
    },
    { validators: aspiranteDatesValidator },
  );

  private loadedPersonaId: number | null = null;

  constructor() {
    this.loadEstados();

    effect(() => {
      const idPersona = this.idPersona();
      if (idPersona && idPersona !== this.loadedPersonaId) {
        this.loadedPersonaId = idPersona;
        this.resetForm();
        this.loadAspirantes(idPersona);
      }
    });
  }

  estadoLabel(estado: Estado): string {
    return `${estado.abreviado} - ${estado.nombre}`;
  }

  estadoAbreviado(idEstado: number | null | undefined): string {
    if (idEstado == null) {
      return '—';
    }
    return this.estados().find((estado) => estado.idEstado === idEstado)?.abreviado ?? '—';
  }

  formatFecha(value: string | number | Date | null | undefined): string {
    return toInputDate(value) || '—';
  }

  onSubmit(): void {
    if (this.aspiranteForm.invalid) {
      this.aspiranteForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    const payload = this.toPayload();
    const request = payload.idAspirante
      ? this.aspiranteService.update(payload)
      : this.aspiranteService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.resetForm({ keepSuccess: true });
        this.loadAspirantes(this.idPersona());
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if (!this.errorHandler.showServerError(err)) {
          this.saveError.set('No se pudo guardar el aspirante. Intenta de nuevo.');
        }
      },
    });
  }

  onEdit(aspirante: Aspirante): void {
    if (aspirante.idAspirante === undefined) {
      return;
    }

    this.saveSuccess.set(false);
    this.saveError.set(null);
    this.editingId.set(aspirante.idAspirante);

    this.aspiranteForm.patchValue({
      idAspirante: String(aspirante.idAspirante),
      idEstado: aspirante.idEstado != null ? String(aspirante.idEstado) : '',
      fechaInicio: toInputDate(aspirante.fechaInicio),
      fechaFin: toInputDate(aspirante.fechaFin),
    });
  }

  onCancelEdit(): void {
    this.resetForm();
  }

  onDelete(aspirante: Aspirante): void {
    if (aspirante.idAspirante === undefined || this.deletingId()) {
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Eliminar aspirante',
      text: '¿Deseas eliminar este aspirante? Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }
      this.deleteAspirante(aspirante);
    });
  }

  private deleteAspirante(aspirante: Aspirante): void {
    const idAspirante = aspirante.idAspirante;
    if (idAspirante === undefined) {
      return;
    }

    this.deletingId.set(idAspirante);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    this.aspiranteService.remove(idAspirante).subscribe({
      next: () => {
        this.deletingId.set(null);
        if (this.editingId() === idAspirante) {
          this.resetForm();
        }
        this.loadAspirantes(this.idPersona());
      },
      error: (err: unknown) => {
        this.deletingId.set(null);
        if (!this.errorHandler.showServerError(err)) {
          this.saveError.set('No se pudo eliminar el aspirante. Intenta de nuevo.');
        }
      },
    });
  }

  private loadAspirantes(idPersona: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.aspiranteService.findByIdPersona(idPersona).subscribe({
      next: (aspirantes) => {
        this.aspirantes.set(aspirantes ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudieron cargar los aspirantes.');
      },
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

  private resetForm(options?: { keepSuccess?: boolean }): void {
    this.editingId.set(null);
    this.saving.set(false);
    if (!options?.keepSuccess) {
      this.saveSuccess.set(false);
    }
    this.saveError.set(null);
    this.aspiranteForm.reset({
      idAspirante: '',
      idEstado: '',
      fechaInicio: todayIso(),
      fechaFin: '',
    });
  }

  private toPayload(): Aspirante {
    const value = this.aspiranteForm.value;
    const idAspirante = value.idAspirante ? Number(value.idAspirante) : undefined;
    const existing =
      idAspirante !== undefined
        ? this.aspirantes().find((aspirante) => aspirante.idAspirante === idAspirante)
        : undefined;
    return {
      ...(idAspirante !== undefined ? { idAspirante } : {}),
      idPersona: this.idPersona(),
      idEstado: value.idEstado ? Number(value.idEstado) : null,
      contadorEstado: existing?.contadorEstado ?? null,
      fechaInicio: value.fechaInicio || null,
      fechaFin: value.fechaFin || null,
    };
  }
}
