import { Component, inject, input, signal, effect, ElementRef, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { Colonia, DomicilioService, Domicilio, Localizacion } from './domicilio.service';

declare global {
  interface Window {
    bootstrap?: {
      Modal: new (element: HTMLElement) => { show(): void; hide(): void };
    };
  }
}

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

  readonly searchingCp = signal(false);
  readonly localizacion = signal<Localizacion | null>(null);

  private readonly cpModalEl = viewChild<ElementRef<HTMLElement>>('cpModal');
  private cpModal?: { show(): void; hide(): void };

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

  searchByCp(): void {
    const cp = this.domicilioForm.controls.cp.value.trim();
    if (!cp) {
      Swal.fire({
        icon: 'warning',
        title: 'Código postal requerido',
        text: 'Captura el código postal antes de buscar.',
      });
      return;
    }

    this.searchingCp.set(true);
    this.domicilioService.findByCp(cp).subscribe({
      next: (localizacion) => {
        this.searchingCp.set(false);
        if (!localizacion) {
          Swal.fire({
            icon: 'info',
            title: 'Sin resultados',
            text: 'No se encontró información para ese código postal.',
          });
          return;
        }
        this.localizacion.set(localizacion);
        this.openModal();
      },
      error: () => {
        this.searchingCp.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo consultar la información del código postal. Intenta de nuevo.',
        });
      },
    });
  }

  useLocalizacion(colonia?: Colonia): void {
    const loc = this.localizacion();
    if (!loc) {
      return;
    }
    this.domicilioForm.patchValue({
      cp: loc.codigo_postal,
      entidadFederativa: loc.estado,
      municipio: loc.municipio,
      ...(colonia ? { localidad: colonia.nombre } : {}),
      pais: 'México',
    });
    this.closeModal();
  }

  private openModal(): void {
    const el = this.cpModalEl()?.nativeElement;
    if (!el || !window.bootstrap) {
      return;
    }
    this.cpModal ??= new window.bootstrap.Modal(el);
    this.cpModal.show();
  }

  private closeModal(): void {
    this.cpModal?.hide();
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
