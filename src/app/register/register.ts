import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RegisterPerson } from './register-person/register-person';
import { RegisterDomicilio } from './register-domicilio/register-domicilio';
import { RegisterImagen } from './register-imagen/register-imagen';

export type RegisterTab = 'persona' | 'domicilio' | 'imagen';

@Component({
  selector: 'app-register',
  imports: [RegisterPerson, RegisterDomicilio, RegisterImagen],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly activeTab = signal<RegisterTab>('persona');
  readonly idPersona = signal<number | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const id = params['idPersona'];
      if (id) {
        this.idPersona.set(Number(id));
      }
    });
  }

  selectTab(tab: RegisterTab): void {
    this.activeTab.set(tab);
  }

  onPersonaSaved(id: number): void {
    this.idPersona.set(id);
  }
}
