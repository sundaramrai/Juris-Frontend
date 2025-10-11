// src/app/components/not-found/not-found.component.ts
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.css'],
  imports: [MatIconModule]
})
export class NotFoundComponent {
  constructor() { }
}
