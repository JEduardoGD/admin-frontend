import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/api.service';

export interface Persona {
  idPersona?: number;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
  fecNac?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PersonaService {
  private readonly api = inject(ApiService);

  create(persona: Persona): Observable<Persona> {
    return this.api.post<Persona>('persona', persona);
  }
}
