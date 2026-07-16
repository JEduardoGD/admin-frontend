import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PersonaService, Persona } from './persona.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly personaService = inject(PersonaService);

  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly personaForm = this.fb.nonNullable.group({
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
    const persona: Persona = {
      nombre: value.nombre,
      primerApellido: value.primerApellido,
      segundoApellido: value.segundoApellido || null,
      fecNac: value.fecNac || null,
    };

    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    this.personaService.create(persona).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.personaForm.reset();
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('No se pudo guardar la persona. Intenta de nuevo.');
      },
    });
  }
}
