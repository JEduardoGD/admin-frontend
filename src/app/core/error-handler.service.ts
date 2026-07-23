import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private readonly router = inject(Router);

  handleUnauthorized(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse && err.status === 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        confirmButtonText: 'Ir al inicio',
      }).then(() => {
        this.router.navigate(['/']);
      });
    }
    return throwError(() => err);
  }
}
