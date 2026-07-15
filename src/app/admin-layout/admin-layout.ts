import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Auth } from '../auth/auth';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, Auth],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {}
