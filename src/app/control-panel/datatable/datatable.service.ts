import { inject, Injectable } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { ErrorHandlerService } from '../../core/error-handler.service';
import { catchError, Observable } from 'rxjs';

export interface DataTablesRequest {
  draw: number;
  start: number;
  length: number;
  search: { value: string; regex: boolean };
  order: Array<{ column: number; dir: string }>;
  columns: Array<{
    data: string;
    name: string;
    searchable: boolean;
    orderable: boolean;
    search: { value: string; regex: boolean };
  }>;
}

export interface DatatableObj {
  idPersona: number;
  name: string;
}

export interface DataTableResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: DatatableObj[];
}

@Injectable({ providedIn: 'root' })
export class DatatableService {
  private readonly api = inject(ApiService);
  private readonly errorHandler = inject(ErrorHandlerService);

  find(request: DataTablesRequest): Observable<DataTableResponse> {
    return this.api.post<DataTableResponse>('sumary', request).pipe(
      catchError((err: unknown) => this.errorHandler.handleUnauthorized(err)),
    );
  }
}
