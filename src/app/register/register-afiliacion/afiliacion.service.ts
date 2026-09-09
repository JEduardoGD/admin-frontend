import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';

export interface Estado {
  idEstado: number;
  abreviado: string;
  nombre: string;
}

export interface Afiliacion {
  idAfiliacion?: number;
  idPersona: number;
  idEstado: number | null;
  fechaInicio: string | number;
  fechaFin: string | number | null;
  vitalicia: boolean;
  deleted: boolean;
  modifiedAt?: string | number | null;
}

@Injectable({ providedIn: 'root' })
export class AfiliacionService {
  private readonly api = inject(ApiService);
  private readonly errorHandler = inject(ErrorHandlerService);

  create(afiliacion: Afiliacion): Observable<Afiliacion> {
    return this.api
      .post<Afiliacion>('afiliacion', afiliacion)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  update(afiliacion: Afiliacion): Observable<Afiliacion> {
    return this.api
      .put<Afiliacion>('afiliacion', afiliacion)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  listEstados(): Observable<Array<Estado>> {
    return this.api
      .get<Array<Estado>>('static_catalog/estado')
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findByIdPersona(idPersona: number): Observable<Array<Afiliacion>> {
    return this.api
      .get<Array<Afiliacion>>(`afiliacion/find_by/id_persona/${idPersona}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }
}
