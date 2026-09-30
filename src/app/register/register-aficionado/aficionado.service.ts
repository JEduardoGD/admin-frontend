import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';

export interface Aficionado {
  idAficionado?: number;
  idPersona: number;
  indicativo: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  idImagen?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AficionadoService {
  private readonly api = inject(ApiService);
  private readonly errorHandler = inject(ErrorHandlerService);

  create(aficionado: Aficionado): Observable<Aficionado> {
    return this.api
      .post<Aficionado>('aficionado', aficionado)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  update(aficionado: Aficionado): Observable<Aficionado> {
    return this.api
      .put<Aficionado>('aficionado', aficionado)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  remove(idAficionado: number): Observable<Aficionado> {
    return this.api
      .delete<Aficionado>(`aficionado/${idAficionado}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findByIdPersona(idPersona: number): Observable<Array<Aficionado>> {
    return this.api
      .get<Array<Aficionado>>(`aficionado/find_by/id_persona/${idPersona}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findById(idAficionado: number): Observable<Aficionado> {
    return this.api
      .get<Aficionado>(`aficionado/find_by/id_aficionado/${idAficionado}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }
}
