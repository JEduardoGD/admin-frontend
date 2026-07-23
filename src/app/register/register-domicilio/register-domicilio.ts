import { Component, inject, input, signal, effect, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { DomicilioService, Domicilio } from './domicilio.service';

@Component({
  selector: 'app-register-domicilio',
  imports: [ReactiveFormsModule],
  templateUrl: './register-domicilio.html',
  styleUrl: './register-domicilio.css',
})
export class RegisterDomicilio {
  private readonly fb = inject(FormBuilder);
  private readonly domicilioService = inject(DomicilioService);

  readonly idPersona = input.required<number>();

  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly domicilioForm = this.fb.nonNullable.group({
    idDomicilio: [''],
    cp: ['', Validators.required],
    domicilio: ['', Validators.required],
    entidadFederativa: ['', Validators.required],
    municipio: ['', Validators.required],
    localidad: ['', Validators.required],
    pais: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const idPersona = this.idPersona();
      if (idPersona) {
        this.loadDomicilio(idPersona);
      }
    });
  }

  private loadDomicilio(idPersona: number): void {
    this.domicilioService.findByIdPersona(idPersona).subscribe({
      next: (domicilios) => {
        if (domicilios && domicilios.length > 0) {
          const dom = domicilios[0];
          this.domicilioForm.patchValue({
            idDomicilio: dom.idDomicilio?.toString() ?? '',
            cp: dom.cp,
            domicilio: dom.domicilio,
            entidadFederativa: dom.entidadFederativa,
            municipio: dom.municipio,
            localidad: dom.localidad,
            pais: dom.pais,
          });
        }
      },
    });
  }

  onSubmit(): void {
    if (this.domicilioForm.invalid) {
      this.domicilioForm.markAllAsTouched();
      return;
    }

    const personaId = this.idPersona();
    const value = this.domicilioForm.getRawValue();
    const idDomicilio = value.idDomicilio ? Number(value.idDomicilio) : undefined;
    const domicilio: Domicilio = {
      ...(idDomicilio !== undefined ? { idDomicilio } : {}),
      idPersona: personaId,
      cp: value.cp,
      domicilio: value.domicilio,
      entidadFederativa: value.entidadFederativa,
      municipio: value.municipio,
      localidad: value.localidad,
      pais: value.pais,
    };

    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    if (idDomicilio !== undefined) {
      this.update(domicilio);
    } else {
      this.create(domicilio);
    }
  }

  private create(domicilio: Domicilio): void {
    this.domicilioService.create(domicilio).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.domicilioForm.patchValue({
          idDomicilio: saved.idDomicilio?.toString() ?? '',
          cp: saved.cp,
          domicilio: saved.domicilio,
          entidadFederativa: saved.entidadFederativa,
          municipio: saved.municipio,
          localidad: saved.localidad,
          pais: saved.pais,
        });
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('No se pudo guardar el domicilio. Intenta de nuevo.');
      },
    });
  }

  private update(domicilio: Domicilio): void {
    this.domicilioService.update(domicilio).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.domicilioForm.patchValue({
          idDomicilio: saved.idDomicilio?.toString() ?? '',
          cp: saved.cp,
          domicilio: saved.domicilio,
          entidadFederativa: saved.entidadFederativa,
          municipio: saved.municipio,
          localidad: saved.localidad,
          pais: saved.pais,
        });
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('No se pudo actualizar el domicilio. Intenta de nuevo.');
      },
    });
  }
}
