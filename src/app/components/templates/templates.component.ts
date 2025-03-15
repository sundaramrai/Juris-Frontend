// src/app/components/templates/templates.component.ts
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-templates',
  standalone: false,
  templateUrl: './templates.component.html',
  styleUrls: ['./templates.component.css']
})
export class TemplatesComponent implements OnInit {
  isLoading = false;

  constructor() { }

  ngOnInit(): void {
  }
}
