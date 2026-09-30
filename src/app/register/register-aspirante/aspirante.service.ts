import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';

export interface Aspirante {
  idAspirante?: number;
  idPersona: number;
  idEstado: number | null;
  contadorEstado?: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
}

@Injectable({ providedIn: 'root' })
export class AspiranteService {
  private readonly api = inject(ApiService);
  private readonly errorHandler = inject(ErrorHandlerService);

  create(aspirante: Aspirante): Observable<Aspirante> {
    return this.api
      .post<Aspirante>('aspirante', aspirante)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  update(aspirante: Aspirante): Observable<Aspirante> {
    return this.api
      .put<Aspirante>('aspirante', aspirante)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  remove(idAspirante: number): Observable<Aspirante> {
    return this.api
      .delete<Aspirante>(`aspirante/${idAspirante}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findByIdPersona(idPersona: number): Observable<Array<Aspirante>> {
    return this.api
      .get<Array<Aspirante>>(`aspirante/find_by/id_persona/${idPersona}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findById(idAspirante: number): Observable<Aspirante> {
    return this.api
      .get<Aspirante>(`aspirante/find_by/id_aspirante/${idAspirante}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }
}
