import { Component, inject, signal, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { PersonaService, Persona } from './persona.service';

@Component({
  selector: 'app-register-person',
  imports: [ReactiveFormsModule],
  templateUrl: './register-person.html',
  styleUrl: './register-person.css',
})
export class RegisterPerson {
  private readonly fb = inject(FormBuilder);
  private readonly personaService = inject(PersonaService);

  readonly personaSaved = output<number>();

  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly personaForm = this.fb.nonNullable.group({
    idPersona: [''],
    nombre: ['', [Validators.required, Validators.maxLength(250)]],
    primerApellido: ['', [Validators.required, Validators.maxLength(250)]],
    segundoApellido: ['', [Validators.maxLength(250)]],
    fecNac: [''],
  });

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
}
