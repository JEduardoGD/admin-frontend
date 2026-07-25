import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RegisterPerson } from './register-person/register-person';
import { RegisterDomicilio } from './register-domicilio/register-domicilio';

@Component({
  selector: 'app-register',
  imports: [RegisterPerson, RegisterDomicilio],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly activeTab = signal('persona');
  readonly idPersona = signal<number | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const id = params['idPersona'];
      if (id) {
        this.idPersona.set(Number(id));
      }
    });
  }

  selectTab(tab: string): void {
    this.activeTab.set(tab);
  }

  onPersonaSaved(id: number): void {
    this.idPersona.set(id);
  }
}
