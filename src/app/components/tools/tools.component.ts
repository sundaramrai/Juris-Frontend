// src/app/components/tools/tools.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tools',
  standalone: false,
  templateUrl: './tools.component.html',
  styleUrl: './tools.component.css'
})
export class ToolsComponent {
  constructor(private router: Router) { }

  isAssistantRoute(): boolean {
    return this.router.url === '/tools/assistant';
  }
}
