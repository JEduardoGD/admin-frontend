import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';

export interface TipoDatoContacto {
  idTipoDatoContacto: number;
  tipoContacto: string;
  descripcion: string;
}

export interface DatoContacto {
  idDatoContacto?: number;
  idPersona: number;
  idTipoDatoContacto: number;
  dato: string;
  inicio?: string | number | null;
  fin?: string | number | null;
}

@Injectable({ providedIn: 'root' })
export class DatoContactoService {
  private readonly api = inject(ApiService);
  private readonly errorHandler = inject(ErrorHandlerService);

  create(datoContacto: DatoContacto): Observable<DatoContacto> {
    return this.api
      .post<DatoContacto>('datocontacto', datoContacto)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  update(datoContacto: DatoContacto): Observable<DatoContacto> {
    return this.api
      .put<DatoContacto>('datocontacto', datoContacto)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  remove(idDatoContacto: number): Observable<unknown> {
    return this.api
      .delete(`datocontacto/${idDatoContacto}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findByIdPersona(idPersona: number): Observable<Array<DatoContacto>> {
    return this.api
      .get<Array<DatoContacto>>(`datocontacto/find_by/idpersona/${idPersona}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  findById(idDatoContacto: number): Observable<DatoContacto> {
    return this.api
      .get<DatoContacto>(`datocontacto/find_by/id/${idDatoContacto}`)
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }

  listTipos(): Observable<Array<TipoDatoContacto>> {
    return this.api
      .get<Array<TipoDatoContacto>>('static_catalog/tipo_datocontacto')
      .pipe(catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)));
  }
}
