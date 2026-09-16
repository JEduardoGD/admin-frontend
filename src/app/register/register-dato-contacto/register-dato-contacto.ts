import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ErrorHandlerService } from '../../core/error-handler.service';
import Swal from 'sweetalert2';
import { DatoContacto, DatoContactoService, TipoDatoContacto } from './dato-contacto.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOVIL_PATTERN = /^\d{10}$/;
const FIJO_PATTERN = /^\d{7,10}$/;

@Component({
  selector: 'app-register-dato-contacto',
  imports: [ReactiveFormsModule],
  templateUrl: './register-dato-contacto.html',
  styleUrl: './register-dato-contacto.css',
})
export class RegisterDatoContacto {
  private readonly fb = inject(FormBuilder);
  private readonly datoContactoService = inject(DatoContactoService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idPersona = input.required<number>();

  readonly datos = signal<Array<DatoContacto>>([]);
  readonly tipos = signal<Array<TipoDatoContacto>>([]);
  readonly tiposError = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly deletingId = signal<number | null>(null);

  readonly datoForm = this.fb.nonNullable.group({
    idDatoContacto: [''],
    idTipoDatoContacto: ['', Validators.required],
    dato: ['', [Validators.required, (control: AbstractControl) => this.validateDato(control)]],
  });

  private loadedPersonaId: number | null = null;

  constructor() {
    this.loadTipos();

    this.datoForm.controls.idTipoDatoContacto.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const dato = this.datoForm.controls.dato;
        if (dato.value) {
          dato.updateValueAndValidity();
        }
      });

    effect(() => {
      const idPersona = this.idPersona();
      if (idPersona && idPersona !== this.loadedPersonaId) {
        this.loadedPersonaId = idPersona;
        this.resetForm();
        this.loadDatos(idPersona);
      }
    });
  }

  tipoLabel(tipo: TipoDatoContacto): string {
    return `${tipo.tipoContacto} - ${tipo.descripcion}`;
  }

  tipoDe(idTipoDatoContacto: number | null | undefined): TipoDatoContacto | undefined {
    return this.tipos().find((tipo) => tipo.idTipoDatoContacto === idTipoDatoContacto);
  }

  tipoNombre(dato: DatoContacto): string {
    return this.tipoDe(dato.idTipoDatoContacto)?.tipoContacto ?? '—';
  }

  onSubmit(): void {
    if (this.datoForm.invalid) {
      this.datoForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    const value = this.datoForm.getRawValue();
    const idDatoContacto = value.idDatoContacto ? Number(value.idDatoContacto) : undefined;
    const payload: DatoContacto = {
      ...(idDatoContacto !== undefined ? { idDatoContacto } : {}),
      idPersona: this.idPersona(),
      idTipoDatoContacto: Number(value.idTipoDatoContacto),
      dato: value.dato.trim(),
    };

    const request = idDatoContacto
      ? this.datoContactoService.update(payload)
      : this.datoContactoService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.resetForm({ keepSuccess: true });
        this.loadDatos(this.idPersona());
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if (!this.errorHandler.showServerError(err)) {
          this.saveError.set('No se pudo guardar el dato de contacto. Intenta de nuevo.');
        }
      },
    });
  }

  onEdit(dato: DatoContacto): void {
    if (dato.idDatoContacto === undefined) {
      return;
    }
    this.saveSuccess.set(false);
    this.saveError.set(null);
    this.editingId.set(dato.idDatoContacto);
    this.datoForm.patchValue({
      idDatoContacto: String(dato.idDatoContacto),
      idTipoDatoContacto: String(dato.idTipoDatoContacto),
      dato: dato.dato,
    });
  }

  onCancelEdit(): void {
    this.resetForm();
  }

  onDelete(dato: DatoContacto): void {
    const idDatoContacto = dato.idDatoContacto;
    if (idDatoContacto === undefined || this.deletingId()) {
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Eliminar dato de contacto',
      text: '¿Deseas eliminar este dato de contacto? Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }
      this.deletingId.set(idDatoContacto);
      this.saveError.set(null);
      this.datoContactoService.remove(idDatoContacto).subscribe({
        next: () => {
          this.deletingId.set(null);
          if (this.editingId() === idDatoContacto) {
            this.resetForm();
          }
          this.loadDatos(this.idPersona());
        },
        error: (err: unknown) => {
          this.deletingId.set(null);
          if (!this.errorHandler.showServerError(err)) {
            this.saveError.set('No se pudo eliminar el dato de contacto. Intenta de nuevo.');
          }
        },
      });
    });
  }

  private loadTipos(): void {
    this.datoContactoService.listTipos().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos ?? []);
        this.tiposError.set(null);
      },
      error: () => this.tiposError.set('No se pudieron cargar los tipos de dato de contacto.'),
    });
  }

  private loadDatos(idPersona: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.datoContactoService.findByIdPersona(idPersona).subscribe({
      next: (datos) => {
        this.datos.set((datos ?? []).filter((dato) => !dato.fin));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudieron cargar los datos de contacto.');
      },
    });
  }

  private validateDato(control: AbstractControl): ValidationErrors | null {
    const value = ((control.value as string) || '').trim();
    if (!value) {
      return null;
    }
    const idTipo = Number(this.datoForm.controls.idTipoDatoContacto.value);
    const tipo = this.tipoDe(idTipo)?.tipoContacto.toUpperCase();
    if (tipo === 'EMAIL' && !EMAIL_PATTERN.test(value)) {
      return { datoEmail: true };
    }
    if (tipo === 'MOVIL' && !MOVIL_PATTERN.test(value)) {
      return { datoMovil: true };
    }
    if (tipo === 'FIJO' && !FIJO_PATTERN.test(value)) {
      return { datoFijo: true };
    }
    return null;
  }

  private resetForm(options?: { keepSuccess?: boolean }): void {
    this.editingId.set(null);
    this.saving.set(false);
    if (!options?.keepSuccess) {
      this.saveSuccess.set(false);
    }
    this.saveError.set(null);
    this.datoForm.reset({
      idDatoContacto: '',
      idTipoDatoContacto: '',
      dato: '',
    });
  }
}
